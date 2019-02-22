import requests
from config import dashconfig
from dashboard import DashboardSlave

slave = DashboardSlave("rtinfo")

while True:
    print("[+] rtinfo: fetching")

    try:
        response = requests.get(dashconfig['rtinfo-endpoint'])
        slave.set(response.json())

        print("[+] rtinfo: %d hosts found" % len(slave.payload['rtinfo']))

        slave.publish()

    except Exception as e:
        print(e)

    slave.sleep(1)
