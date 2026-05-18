import requests
import time
import copy
from dashboard import DashboardSlave
from config import dashconfig as config

slave = DashboardSlave("switch-status")

class TPLinkSwitchWebExtractor:
    def __init__(self, hostname, username, password):
        self.hostname = hostname
        self.username = username
        self.password = password

        self.devname = None

        self.headers = {
            "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "X-Requested-With": "XMLHttpRequest",
            "Referer": f"http://{hostname}"
        }

        self.tokenid = None
        self.userlvl = None

        self.session = requests.session()

        self.snapshot = None
        self.snaptime = None
        self.speeds = [0, 10, 100, 1000]

    def get(self, module):
        endpoint = f"http://{self.hostname}/data/{module}.json?_tid_={self.tokenid}&usrLvl={self.userlvl}"
        request = self.session.get(endpoint, headers=self.headers)
        response = request.json()

        if not response['success']:
            raise RuntimeError("Could not perform GET request")

        return response['data']

    def post(self, module, data):
        endpoint = f"http://{self.hostname}/data/{module}.json?_tid_={self.tokenid}&usrLvl={self.userlvl}"
        request = self.session.post(endpoint, json=data, headers=self.headers)
        response = request.json()

        if not response['success']:
            raise RuntimeError("Could not perform POST request")

        return response['data']

    def login(self):
        print("[+] switch: attempt to login")

        data = {"operation": "write", "username": self.username, "password": self.password}
        endpoint = f"http://{self.hostname}/data/login.json"

        request = self.session.post(endpoint, json=data, headers=self.headers)
        response = request.json()
        # print(response)

        if not response['success']:
            raise RuntimeError("Authentication failed")

        self.tokenid = response['data']['_tid_']
        self.userlvl = response['data']['usrLvl']

        print(f"[+] switch: access authorized")
        print(f"[+] switch: session token: {self.tokenid}, level: {self.userlvl}")

        return True

    def summary(self):
        print("[+] switch: requesting system summary data")

        data = {"operation": "read", "tab": "unit1"}
        response = self.post("systemSummaryConfig", data)

        self.devname = response['dev_name']

        return response

    def interfaces(self):
        print("[+] switch: requesting interfaces status")

        data = {"operation": "load", "special": "display", "tab": "unit1"}
        return self.post("port", data)

    def ports_settings(self):
        print("[+] switch: requesting ports configuration")

        data = {"operation": "load", "tab": "unit1"}
        return self.post("swtPortCfg", data)

    def interfaces_counters(self):
        print("[+] switch: requesting interfaces traffic counters")

        data = {"operation": "load", "tab": "unit1"}
        return self.post("trafficMonitorCfgStore", data)

    def interfaces_current_bandwidth(self):
        statistics = self.interfaces_counters()
        interfaces = []

        if self.snapshot is None:
            # initialize first empty snapshot manually
            self.snapshot = [{"port": "", "rx-bytes": 0, "tx-bytes": 0}] * len(statistics)
            self.snaptime = time.time()

        timenow = time.time()
        diffcheck = timenow - self.snaptime

        for idx, source in enumerate(statistics):
            rxbytes = int(source['octetsRx'].replace(",", ""))
            txbytes = int(source['octetsTx'].replace(",", ""))

            interfaces.append({
                "port": source['port'],
                "rx-bytes": rxbytes,
                "tx-bytes": txbytes,
                "rx-live": (rxbytes - self.snapshot[idx]['rx-bytes']) / diffcheck,
                "tx-live": (txbytes - self.snapshot[idx]['tx-bytes']) / diffcheck,
            })

        # save this frame as last snapshot
        self.snapshot = copy.copy(interfaces)
        self.snaptime = timenow

        return interfaces

    def ddm_status(self):
        print("[+] switch: requesting ddm current status")

        data = {"operation": "load"}
        return self.post("ddmStatusCfg", data)

    def cpu_usage(self):
        print("[+] switch: requesting current cpu usage")

        data = {"unit": "unit1"}
        return self.post("cpuInfo", data)

    def memory_usage(self):
        print("[+] switch: requesting current memory usage")

        data = {"unit": "unit1"}
        return self.post("memoryInfo", data)

swcore = config["switch-core"]
swroom = config["switch-room"]

core = TPLinkSwitchWebExtractor(swcore["host"], swcore["user"], swcore["pass"])
room = TPLinkSwitchWebExtractor(swroom["host"], swroom["user"], swroom["pass"])
metrics = {}

for sw in [core, room]:
    sw.login()
    sw.summary()

    metrics[sw.devname] = {
        "system": {"cpu": 0, "ram": 0},
        "ddm": [],
        "ports": [],
        "timestamp": None,
    }

index = 0

while True:
    for sw in [core, room]:
        device = metrics[sw.devname]

        intf = sw.interfaces_current_bandwidth()
        device["ports"] = intf

        ports = sw.interfaces()
        for (key, value) in enumerate(ports):
            port = device["ports"][key]
            port['up'] = (value['linkStatus'] == 1)
            port['type'] = value['type']
            port['speed'] = sw.speeds[value['speedLink']]

        """
        for iff in intf:
            print(f"[+] {iff['port']} : {iff['rx-bytes']}, {iff['tx-bytes']} | {iff['rx-live']}, {iff['tx-live']}")

        print("")
        """

        if index % 4 == 0:
            cpu = sw.cpu_usage()
            device["system"]["cpu"] = cpu["cpu"][0]
            # print(f"[+] CPU: {cpu['cpu'][0]} %")

            ram = sw.memory_usage()
            device["system"]["ram"] = ram["memory"][0]
            # print(f"[+] RAM: {ram['memory'][0]} %")

            ddms = sw.ddm_status()
            device["ddm"] = []

            for ddm in ddms:
                device["ddm"].append({
                    "port": ddm["port"],
                    "loss": ddm["lossOfSignal"],
                    "temperature": ddm["temperature"],
                    "rxpower": ddm["rxPower"],
                    "txpower": ddm["txPower"],
                    "flags": {
                        "bias": ddm["biasCurrentFlag"],
                        "rxp": ddm["rxPowerFlag"],
                        "txp": ddm["txPowerFlag"],
                        "temperature": ddm["temperatureFlag"],
                        "voltage": ddm["voltageFlag"]
                    },
                })

                # print(f"[+] {ddm['port']}: {ddm['temperature']:.1f}°C - loss {ddm['lossOfSignal']}")

            # print("")

        if index % 24 == 0:
            for (key, value) in enumerate(sw.ports_settings()):
                device["ports"][key]["description"] = value["description"]

        device["timestamp"] = time.time()

    index += 1

    slave.set(metrics)
    slave.publish()
    slave.sleep(2)
