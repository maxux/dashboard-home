import json
import time
import redis
from config import dashconfig
from dashboard import DashboardSlave

r = redis.Redis()
slave = DashboardSlave("dnsquery")

class BindRedisStats:
    def __init__(self, target="127.0.0.1"):
        self.read = redis.Redis(target)
        self.write = redis.Redis(target)

        self.reader = self.read.pubsub()
        self.reader.subscribe("bind-query")

        self.excludes = ["10.241.0.252", "10.241.0.253"]
        self.lastline = ""

    def process(self, message):
        client = message.split()
        host = client[2].split("#")

        hostaddr = host[0]
        query = client[5]

        # ignore RIPE
        if host[0] in self.excludes:
            return None

        # ignore double lines
        if self.lastline == query:
            return None

        # update last line
        self.lastline = query

        return {"host": hostaddr, "query": query}

    def loop(self):
        message = self.reader.get_message(timeout=10)

        if message is None:
            return

        if message['type'] != 'message':
            return

        return self.process(message['data'].decode('utf-8'))

    def run(self):
        while True:
            print(self.loop())

print("[+] waiting for dns queries")
b = BindRedisStats()

while True:
    data = b.loop()
    if data is None:
        continue

    print(data)

    slave.set(data)
    slave.publish()

