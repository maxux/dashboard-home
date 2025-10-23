import json
import time
import redis
from config import dashconfig
from dashboard import DashboardSlave

r = redis.Redis(decode_responses=True)
slave = DashboardSlave("devices")

while True:
    print("[+] local (dhcp) devices checker: updating")

    devices = {}

    """
    dhclients = r.keys('dhcp-*')
    for client in dhclients:
        data = r.get(client)
        if not data:
            continue

        payload = data.decode('utf-8')
        keyname = client.decode('utf-8')[5:]

        devices[keyname] = json.loads(payload)
    """

    clients = r.keys('traffic-*')
    for client in clients:
        payload = r.get(client)
        live = json.loads(payload)

        # ignore inactive client
        if live['active'] < time.time() - (4 * 3600):
            continue

        # dhcpfound = False
        address = client[13:]
        hostname = r.get(f"hostname-address-{address}")
        if hostname:
            hostname = hostname.replace(".home.maxux.net", "")

        devices[live['addr']] = {
            "timestamp": live['active'],
            "mac-address": live['macaddr'],
            "hostname": hostname or None,
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

