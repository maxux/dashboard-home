import requests
from config import dashconfig
from dashboard import DashboardSlave

slave = DashboardSlave("rtinfo-local")

while True:
    print("[+] rtinfo-local: fetching")

    try:
        response = requests.get(dashconfig['rtinfo-local-endpoint'], timeout=2)
        slave.set(response.json())

        print("[+] rtinfo-local: %d hosts found" % len(slave.payload['rtinfo']))

        slave.publish()

    except Exception as e:
        print(e)

    slave.sleep(1)
