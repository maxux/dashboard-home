import asyncio
import websockets
import json
import redis
import time
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
        self.wsclients = set()
        self.payloads = {}
        self.redis = redis.Redis()

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
                clients[newclient] = payload[client]
                clients[newclient]['bssid'] = 'xx:xx:xx:xx:xx:xx'

            return clients

        if type == 'rtinfo':
            for index, value in enumerate(payload['rtinfo']):
                network = value['network']

                for nindex, nic in enumerate(network):
                    nic['ip'] = '0.0.0.0'
                    nic['name'] = 'filter'

            return payload

        return payload

    #
    # Websocket
    #
    async def wsbroadcast(self, type, payload):
        if not len(self.wsclients):
            return

        goodcontent = json.dumps({"type": type, "payload": payload})

        for client in list(self.wsclients):
            if not client.open:
                continue

            content = goodcontent

            # replacing payload with filtered contents if needed
            if not client.remote_address[0].startswith(dashconfig['trusted-prefix']):
                fixedpayload = self.privatefix(type, payload)
                content = json.dumps({"type": type, "payload": fixedpayload})

            try:
                await client.send(content)

            except Exception as e:
                print(e)

    async def wspayload(self, websocket, type, payload):
        if not websocket.remote_address[0].startswith(dashconfig['trusted-prefix']):
            payload = self.privatefix(type, payload)

        content = json.dumps({"type": type, "payload": payload})
        await websocket.send(content)

    async def handler(self, websocket, path):
        self.wsclients.add(websocket)

        print("[+] websocket: client connected")

        try:
            for id in self.payloads:
                await self.wspayload(websocket, id, self.payloads[id])

            while True:
                if not websocket.open:
                    break

                await asyncio.sleep(1)

        finally:
            print("[+] websocket: client disconnected")
            self.wsclients.remove(websocket)

    async def redisloop(self):
        pubsub = self.redis.pubsub()
        pubsub.subscribe(['dashboard'])

        while True:
            message = pubsub.get_message()
            if message and message['type'] == 'message':
                handler = json.loads(message['data'])

                print("[+] forwarding data from slave: %s" % handler['id'])

                # caching payload
                self.payloads[handler['id']] = handler['payload']

                # forwarding
                await self.wsbroadcast(handler['id'], handler['payload'])

            await asyncio.sleep(0.1)

    def run(self):
        # standard polling handlers
        loop = asyncio.get_event_loop()
        loop.set_debug(True)

        # handle websocket communication
        websocketd = websockets.serve(self.handler, dashconfig['ws-listen-addr'], dashconfig['ws-listen-port'])
        asyncio.ensure_future(websocketd, loop=loop)
        asyncio.ensure_future(self.redisloop(), loop=loop)

        print("[+] waiting for clients or slaves")
        loop.run_forever()

if __name__ == '__main__':
    dashboard = DashboardServer()
    dashboard.run()
