import requests
import time
from config import dashconfig
from dashboard import DashboardSlave

slave = DashboardSlave("weather")

while True:
    print("[+] weather information: fetching")

    response = requests.get(dashconfig['weather-station'], timeout=3).json()
    slave.set(response)

    if not response:
        slave.set({"temp": "-", "press": "-", "hum":"-", "dew":"-", "wind":0, "uv":"-", "widir":"-", "gust": None, "solar":"-"})

    response = requests.get(dashconfig['weather-rain'], timeout=3).json()
    if not response:
        continue

    slave.payload['rain90min'] = response['rain_90min']
    slave.payload['updated'] = int(time.time())

    # notify connected client
    print("[+] weather information: %s, %s" % (slave.payload['temp'], slave.payload['press']))
    slave.publish()

    slave.sleep(5 * 60)
