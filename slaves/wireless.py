import time
from modules.lapac import *
from config import dashconfig
from dashboard import DashboardSlave

slave = DashboardSlave("wireless")

monitor = LAPACMonitor(
    dashconfig['lapac-address'],
    dashconfig['lapac-username'],
    dashconfig['lapac-password']
)

while True:
    print("[+] wireless: updating")

    try:
        response = monitor.allclients()
        print("[+] wireless: %d clients found" % len(monitor.clients))

    except Exception as e:
        print(e)

    payload = {
        'update': int(time.time()),
        'clients': monitor.clients
    }

    slave.set(payload)
    slave.publish()
    slave.sleep(2)

