import requests
import time
import hashlib
import pprint
from config import dashconfig
from dashboard import DashboardSlave

slave = DashboardSlave("weather")

while True:
    print("[+] weather information: fetching")

    ti = "%d" % int(time.time() / (60 * 60))
    m = hashlib.md5()
    m.update(ti.encode('utf-8'))
    key = m.digest().hex()

    try:
        response = requests.get(dashconfig['weather-forecast'] + "&key=" + key, timeout=3).json()
        slave.set(response)

        if not response:
            slave.set({"timestamp": 0})

    except Exception as e:
        print(e)
        slave.sleep(5)
        continue

    pprint.pprint(response)

    slave.payload['rain90min'] = response['zone']['rain_90min']
    slave.payload['updated'] = int(time.time())

    # notify connected client
    print("[+] weather information: timestamp: %s" % (slave.payload['timestamp']))
    slave.publish()

    slave.sleep(5 * 60)
