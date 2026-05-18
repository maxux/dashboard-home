import asyncio
import json
import redis
import time
import traceback
import uuid
import websockets
from websockets.asyncio.server import serve
from config import dashconfig

class DashboardSlave():
    def __init__(self, name):
        self.name = name
        self.redis = redis.Redis()
        self.payload = {}

    def set(self, value):
        self.payload = value

    def publish(self):
        self.redis.publish("dashboard", json.dumps({"id": self.name, "payload": self.payload}))

    def sleep(self, seconds):
        time.sleep(seconds)

    def objdump(self, obj):
        return json.dumps(obj, indent=2, default=str)

class DashboardServer():
    def __init__(self):
        self.clients = {}
        self.hosts = {}
        self.filters = {}
        self.payloads = {}

    """
    # privacy handler
    def privatefix(self, type, payload):
        if type == 'devices':
            clients = {}
            index = 0

            for client in payload:
                newclient = 'host-%d' % index
                clients[newclient] = payload[client]
                clients[newclient]['mac-address'] = 'xx:xx:xx:xx:xx:xx'
                clients[newclient]['hostname'] = '(filtered name)'

                index += 1

            return clients

        if type == 'wireless':
            clients = {}
            index = 0

            for client in payload:
                newclient = 'host-%d' % index
                clients[newclient] = client
                # clients[newclient]['bssid'] = 'xx:xx:xx:xx:xx:xx'

            return clients

        if type == 'rtinfo':
            for index, value in enumerate(payload['rtinfo']):
                network = value['network']

                for nindex, nic in enumerate(network):
                    nic['ip'] = '0.0.0.0'
                    nic['name'] = 'filter'

            return payload

        return payload
    """

    async def broadcast_clients(self, data):
        # payload = self.format_payload(clientid, handler['id'], handler['payload'])
        payload = self.format_payload(data['id'], data['payload'])

        try:
            for clientid in self.clients:
                await self.clients[clientid].send(payload)

        except websockets.exceptions.ConnectionClosedError as error:
            print(error)

        except websockets.exceptions.ConnectionClosedOK as error:
            print(error)

        except Exception as error:
            print(error)

    async def broadcast_clients_filters(self, data):
        # payload = self.format_payload(clientid, handler['id'], handler['payload'])
        payload = self.format_payload(data["id"], data["payload"])

        try:
            for clientid in self.filters:
                if self.filters[clientid].get(data["id"]):
                    print(f"[+] forwarding [{data['id']}] to [{clientid}]")
                    await self.clients[clientid].send(payload)

        except websockets.exceptions.ConnectionClosedError as error:
            print(error)

        except websockets.exceptions.ConnectionClosedOK as error:
            print(error)

        except Exception as error:
            print(error)


    # def format_payload(self, clientid, type, payload):
    def format_payload(self, type, payload):
        """
        if not self.hosts[clientid].startswith(dashconfig['trusted-prefix']):
            print(f"[+] privacy: fixing for: {self.hosts[clientid]}")
            payload = self.privatefix(type, payload)
        """

        content = json.dumps({"type": type, "payload": payload})
        return content

    async def redis_reader(self, channel):
        while True:
            message = await channel.get_message(ignore_subscribe_messages=True, timeout=None)
            if message is None:
                continue

            if message and message['type'] == 'message':
                handler = json.loads(message['data'])

                print("[+] forwarding data from slave: %s" % handler['id'])

                # caching payload
                id = handler['id']
                if "id" in handler['payload']:
                    id = "%s-%s" % (handler['id'], handler['payload']['id'])

                self.payloads[id] = {
                    "id": handler['id'],
                    "payload": handler['payload'],
                }

                # await self.broadcast_clients(handler)
                await self.broadcast_clients_filters(handler)

    async def websocket_handler(self, websocket):
        clientid = str(uuid.uuid4())
        print(f"[+] websocket: new client: {clientid}")

        try:
            clienthost = "UNKNOWN"

            if 'X-Real-IP' in websocket.request.headers:
                clienthost = websocket.request.headers['X-Real-IP']

            self.hosts[clientid] = clienthost
            self.clients[clientid] = websocket
            self.filters[clientid] = {}

            # request a quick latency checking
            await websocket.ping()

            while True:
                data = await websocket.recv(decode=False)
                message = json.loads(data)

                if "id" in message and message["id"] == "register":
                    if "watch" in message:
                        for watch in message["watch"]:
                            print(f"[+] websocket: client {clientid}: watching for {watch}")
                            self.filters[clientid][watch] = True

                    # sending backlog if available
                    for id in self.payloads:
                        item = self.payloads[id]

                        if self.filters[clientid].get(item["id"]):
                            print(f"[+] websocket: client {clientid}: sending backlog: {id}")
                            payload = self.format_payload(item["id"], item["payload"])

                            await websocket.send(payload)

        except websockets.exceptions.ConnectionClosedError:
            print(f"[-][{clientid}] connection closed prematurely")

        finally:
            print(f"[+][{clientid}] disconnected, cleaning up")

            # remove clientid from websockets clients list
            if clientid in self.clients:
                print(f"[+][{clientid}] cleaning up clients list")
                del self.clients[clientid]
                del self.hosts[clientid]
                del self.filters[clientid]

    async def process_websocket(self):
        # fetching instance settings
        wslisten = dashconfig['ws-listen-addr']
        wsport = dashconfig['ws-listen-port']

        async with serve(self.websocket_handler, wslisten, wsport) as server:
            print(f"[+] websocket: waiting for clients on: [{wslisten}:{wsport}]")
            await server.serve_forever()

    async def process_redis(self):
        # fetching instance settings
        redis_channel = "dashboard"
        while True:
            print("[+] redis: connecting to backend with asyncio")

            try:
                self.redis = redis.asyncio.Redis(
                    decode_responses=True,
                    client_name="dashboard-dispatcher"
                )

                async with self.redis.pubsub() as pubsub:
                    print(f"[+] redis: subscribing to: {redis_channel}")
                    await pubsub.subscribe(redis_channel)

                    print(f"[+] redis: waiting for events")
                    await self.redis_reader(pubsub)

            except redis.exceptions.ConnectionError as error:
                print(f"[-] redis: connection lost: {error} attempting to reconnect")

                await asyncio.sleep(1)
                continue

            except Exception:
                print("[-] redis: unhandled exception, stopping")
                traceback.print_exc()
                return None

    def run(self):
        loop = asyncio.new_event_loop()
        loop.set_debug(True)

        loop.create_task(self.process_websocket())
        loop.create_task(self.process_redis())

        loop.run_forever()

if __name__ == '__main__':
    dashboard = DashboardServer()
    dashboard.run()
