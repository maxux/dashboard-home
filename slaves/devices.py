import json
import time
import redis
from config import dashconfig
from dashboard import DashboardSlave

r = redis.Redis()
slave = DashboardSlave("devices")

while True:
    print("[+] local (dhcp) devices checker: updating")

    devices = {}

    dhclients = r.keys('dhcp-*')
    for client in dhclients:
        data = r.get(client)
        if not data:
            continue

        payload = data.decode('utf-8')
        keyname = client.decode('utf-8')[5:]

        devices[keyname] = json.loads(payload)

    clients = r.keys('traffic-*')
    for client in clients:
        payload = r.get(client).decode('utf-8')
        live = json.loads(payload)

        # ignore inactive client
        if live['active'] < time.time() - (4 * 3600):
            continue

        dhcpfound = False

        for device in devices:
            if devices[device]['ip-address'] == live['addr']:
                devices[device]['rx'] = live['rx']
                devices[device]['tx'] = live['tx']
                devices[device]['timestamp'] = live['active']
                devices[device]["total-rx"] = live['total-rx']
                devices[device]["total-tx"] = live['total-tx']

                if devices[device]['hostname']:
                    devices[device]['hostname'] = devices[device]['hostname'].replace(".home.maxux.net", "")

                dhcpfound = True
                break

        if not dhcpfound:
            devices[live['addr']] = {
                "timestamp": live['active'],
                "mac-address": live['macaddr'],
                "hostname": live['host'].replace(".home.maxux.net", "") if 'host' in live else None,
                "ip-address": live['addr'],
                "rx": live['rx'],
                "tx": live['tx'],
                "total-rx": live['total-rx'],
                "total-tx": live['total-tx'],
            }

    print("[+] local devices checker: %d devices found" % len(devices))
    slave.set(devices)
    slave.publish()
    slave.sleep(1)

