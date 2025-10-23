import sys
import time
import redis
import json
import io
from datetime import datetime
from datetime import date
from datetime import timezone

class DHCPLogger():
    def __init__(self, filename):
        self.filename = filename

        self.expire = 3600 * 12

        self.redis = redis.Redis()

    def isExpired(self, timestamp):
        return (timestamp < time.time() - self.expire)

    def timestamp(self, fields):
        now = date.today().year
        timestr = '%s %s %s %d' % (fields[0], fields[1], fields[2], now)
        target = datetime.strptime(timestr, '%b %d %X %Y')

        compare = target.replace(year=now).timestamp()

        # if we are on the futur, this is probably a previous year
        if compare > time.time():
            now -= 1
            compare = target.replace(year=now).timestamp()

        return int(compare)

    def watch(self):
        fp = open(self.filename, 'r')

        while True:
            try:
                line = fp.readline()

            except:
                continue

            if not line:
                time.sleep(1)
                continue


            if not "Added new forward map from" in line:
                continue

            # skip date to avoid double space on day date < 10
            words = line[16:].split(" ")
            hostname = words[7].strip()
            address = words[9].strip()

            print(f"Committing hostname: {hostname} -> {address}")
            # self.redis.set(f"hostname-address-{address}", hostname, self.expire)
            self.redis.set(f"hostname-address-{address}", hostname)


if __name__ == '__main__':
    print("Fetching logs...")
    dhcp = DHCPLogger("/var/log/dhcpd.log")
    dhcp.watch()
