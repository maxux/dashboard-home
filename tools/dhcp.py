import sys
import time
import redis
import dns.resolver
import dns.reversename
import json
from datetime import datetime
from datetime import date
from datetime import timezone

class DHCPLogger():
    def __init__(self, filename):
        self.filename = filename

        self.resolver = dns.resolver.Resolver()
        self.resolver.nameservers = ['10.241.0.254']

        self.redis = redis.Redis()

    def isExpired(self, timestamp):
        return (timestamp < time.time() - (3600 * 24))

    def timestamp(self, fields):
        timestr = '%s %s %s' % (fields[0], fields[1], fields[2])
        target = datetime.strptime(timestr, '%b %d %X')
        now = date.today().year

        compare = target.replace(year=now).timestamp()

        # if we are on the futur, this is probably a previous year
        if compare > time.time():
            now -= 1
            compare = target.replace(year=now).timestamp()

        return int(compare)

    def client(self, line):
        fields = line.split()

        timestamp = self.timestamp(fields)
        if self.isExpired(timestamp):
            return None

        hostname = None
        if fields[10] != "via":
            hostname = fields[10][1:-1]

        client = {
            'ip-address': fields[7],
            'mac-address': fields[9],
            'hostname': hostname,
            'timestamp': timestamp,
        }

        # trying dns resolution for hostname
        if not hostname:
            try:
                reverse = dns.reversename.from_address(client['ip-address'])
                pointer = self.resolver.query(reverse, "PTR")[0]

                fields = str(pointer).split('.')
                client['hostname'] = fields[0]

            except Exception as e:
                # print(e)
                pass

        return client

    def save(self, client):
        print(client)

        key = "dhcp-%s" % client['mac-address']
        payload = json.dumps(client)
        expire = (3600 * 8)

        self.redis.set(key, payload, ex=expire)

    def watch(self):
        fp = open(self.filename, 'r')

        while True:
            line = fp.readline()

            if not line:
                time.sleep(1)
                continue

            if "DHCPACK" in line:
                client = self.client(line)

                if not client:
                    continue

                self.save(client)

if __name__ == '__main__':
    print("Fetching logs...")
    dhcp = DHCPLogger("/var/log/messages")
    dhcp.watch()
