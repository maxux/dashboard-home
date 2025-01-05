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

class DashboardServer():
    def __init__(self):
        self.clients = {}
        self.hosts = {}
        self.payloads = {}

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

    def format_payload(self, clientid, type, payload):
        if not self.hosts[clientid].startswith(dashconfig['trusted-prefix']):
            print(f"[+] privacy: fixing for: {self.hosts[clientid]}")
            payload = self.privatefix(type, payload)

        content = json.dumps({"type": type, "payload": payload})
        return content

    async def redis_reader(self, channel):
        while True:
            message = await channel.get_message(ignore_subscribe_messages=True, timeout=0.1)
            # print(message)

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

                for clientid in self.clients:
                    payload = self.format_payload(clientid, handler['id'], handler['payload'])
                    await self.clients[clientid].send(payload)

    async def websocket_handler(self, websocket):
        clientid = str(uuid.uuid4())
        print(f"[+] websocket: new client: {clientid}")

        try:
            clienthost = "UNKNOWN"

            if 'X-Real-IP' in websocket.request.headers:
                clienthost = websocket.request.headers['X-Real-IP']

            self.hosts[clientid] = clienthost
            self.clients[clientid] = websocket

            for id in self.payloads:
                item = self.payloads[id]
                print("[+] sending backlog: %s (%s)" % (id, item['id']))

                payload = self.format_payload(clientid, item['id'], item['payload'])
                await websocket.send(payload)

            # request a quick latency checking
            await websocket.ping()

            # do not listen for client messages
            await websocket.wait_closed()

        except websockets.exceptions.ConnectionClosedError:
            print(f"[-][{clientid}] connection closed prematurely")

        finally:
            print(f"[+][{clientid}] disconnected, cleaning up")

            # remove clientid from websockets clients list
            if clientid in self.clients:
                print(f"[+][{clientid}] cleaning up clients list")
                del self.clients[clientid]
                del self.hosts[clientid]

    async def process(self):
        # fetching instance settings
        redis_channel = "dashboard"
        websocket_address = dashconfig['ws-listen-addr']
        websocket_port = dashconfig['ws-listen-port']

        async with serve(self.websocket_handler, websocket_address, websocket_port):
            print(f"[+] websocket: waiting for clients on: [{websocket_address}:{websocket_port}]")
            future_ws = asyncio.get_running_loop().create_future()

            while True:
                print("[+] redis: connecting to backend with asyncio")

                try:
                    self.redis = redis.asyncio.Redis(
                        # host=dashconfig['redis-host'],
                        # port=dashconfig['redis-port'],
                        decode_responses=True,
                        client_name="dashboard-dispatcher"
                    )

                    async with self.redis.pubsub() as pubsub:
                        print(f"[+] redis: subscribing to: {redis_channel}")
                        await pubsub.subscribe(redis_channel)

                        print(f"[+] redis: waiting for events")
                        future_redis = asyncio.create_task(self.redis_reader(pubsub))
                        await future_redis

                except redis.exceptions.ConnectionError as error:
                    print(f"[-] redis: connection lost: {error} attempting to reconnect")

                    await asyncio.sleep(1)
                    continue

                except Exception:
                    print("[-] redis: unhandled exception, stopping")
                    traceback.print_exc()
                    return None

            await future_ws

    def run(self):
        loop = asyncio.get_event_loop()
        loop.set_debug(True)
        loop.run_until_complete(self.process())

if __name__ == '__main__':
    dashboard = DashboardServer()
    dashboard.run()

