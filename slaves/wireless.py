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

    response = monitor.allclients()
    print("[+] wireless: %d clients found" % len(monitor.clients))

    slave.set(monitor.clients)
    slave.publish()
    slave.sleep(2)

