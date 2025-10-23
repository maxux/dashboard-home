import redis
import json
import requests
import urllib3
from config import dashconfig
from dashboard import DashboardSlave
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

slave = DashboardSlave("redfish-power")

class RedfishRemote:
    def __init__(self, hostname, address, username, password):
        self.hostname = hostname
        self.address = address
        self.username = username
        self.password = password

        self.session = requests.Session()
        self.session.auth = (self.username, self.password)
        self.session.headers = {'Accept': 'application/json'}

    def watt(self):
        power = self.session.get(f"https://{self.address}/redfish/v1/Chassis/System.Embedded.1/Power/PowerControl", verify=False)
        info = power.json()

        return info['PowerConsumedWatts']

    def volt(self):
        voltage = self.session.get(f"https://{self.address}/redfish/v1/Chassis/System.Embedded.1/Power/PowerSupplies/PSU.Slot.1", verify=False)
        info = voltage.json()

        return info['LineInputVoltage']

servers = [
    RedfishRemote("routinx-ng", "10.241.100.250", dashconfig['idrac-username'], dashconfig['idrac-password']),
    RedfishRemote("servix-ng", "10.241.100.240", dashconfig['idrac-username'], dashconfig['idrac-password']),
    RedfishRemote("storix-ng", "10.241.100.230", dashconfig['idrac-username'], dashconfig['idrac-password']),
]

usage = {}

while True:
    try:
        for server in servers:
            watt = server.watt()
            volt = server.volt()

            usage[server.hostname] = {"power": watt, "voltage": volt}

            print(f"[+] {server.hostname}: power: {watt} watt, {volt} volt")

            slave.set(usage)
            slave.publish()

    except Exception as error:
        print(error)

    slave.sleep(5)
