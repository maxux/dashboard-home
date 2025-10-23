from modules.netuse import *
from config import dashconfig
from dashboard import DashboardSlave

pings = dashconfig['ping-targets']
ping = RootPing()

slave = DashboardSlave("ping")
payload = {}

while True:
    for target in pings:
        print("[+] ping checker: pinging %s" % target)

        value = ping.ping_host(pings[target]['target'])
        pings[target]['value'] = value
        print("[+] ping checker: %s, %s" % (target, value))

        slave.set({"name": target, "data": pings[target]})
        slave.publish()

    slave.sleep(8)
