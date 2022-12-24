import requests
import hashlib
import time

class TechnicolorCGA:
    def __init__(self, username, password, router="192.168.100.1"):
        # global verbose flag to enable or not debug output
        self.verbose = True

        self.debug("[+] initializing technicolor cga module")

        self.server = f"http://{router}"
        self.username = username
        self.password = password

        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36"})
        self.session.headers.update({"X-Requested-With": "XMLHttpRequest"})

    """
    Helpers
    """
    def debug(self, message):
        if self.verbose:
            print(message)

    def endpoint(self, target, options):
        opts = ",".join(options)
        now = int(time.time())

        if len(options) == 0:
            return f"{self.server}/api/v1/{target}?_={now}"

        return f"{self.server}/api/v1/{target}/{opts}?_={now}"

    def call(self, endpoint):
        request = self.session.get(endpoint)
        response = request.json()
        return response["data"]

    """
    Login
    """
    def challenge(self, password, salt):
        bpass = password.encode('utf-8')
        bsalt = salt.encode('utf-8')

        return hashlib.pbkdf2_hmac('sha256', bpass, bsalt, 1000).hex()[:32]

    def login(self):
        data = {
            "username": self.username,
            "password": "seeksalthash"
        }

        self.debug("[+] fetching salt from webui")

        endpoint = self.endpoint("session", ["login"])
        request = self.session.post(endpoint, data=data)

        self.debug(f'[+] php session id: {request.cookies["PHPSESSID"]}')
        response = request.json()

        self.debug(f'[+] challenge salt: {response["salt"]}')
        self.debug(f'[+] webui salt: {response["saltwebui"]}')

        challenge = self.challenge(self.password, response['salt'])
        challenge = self.challenge(challenge, response['saltwebui'])

        self.debug(f"[+] challenge: {challenge}")
        self.debug("[+] attempting to login")

        data = {
            "username": "voo",
            "password": challenge
        }

        endpoint = self.endpoint("session", ["login"])
        request = self.session.post(endpoint, data=data)
        response = request.json()

        if response['error'] == 'ok':
            self.debug("[+] logged in")
            self.session.headers.update({'X-CSRF-TOKEN': self.session.cookies['auth']})

            # required to allow further request, for some reason
            endpoint = self.endpoint("session", ["menu"])
            menu = self.session.get(endpoint)
            return True

        raise RuntimeError("invalid credentials")


    """
    Queries
    """
    def system(self):
        self.debug("[+] fetching system information")

        options = [
            "HardwareVersion",
            "FirmwareName",
            "CMMACAddress",
            "MACAddressRT",
            "UpTime",
            "LocalTime",
            "LanMode",
            "ModelName",
            "CMStatus",
            "ModelName",
            "Manufacturer",
            "SerialNumber",
            "SoftwareVersion",
            "BootloaderVersion",
            "CoreVersion",
            "FirmwareBuildTime",
            "ProcessorSpeed",
            "CMMACAddress",
            "Hardware",
            "MemTotal",
            "MemFree"
        ]

        endpoint = self.endpoint("system", options)
        return self.call(endpoint)

    def levels(self):
        self.debug("[+] fetching docsis signal levels")

        options = [
            "exUSTbl",
            "exDSTbl",
            "USTbl",
            "DSTbl",
            "ErrTbl"
        ]

        endpoint = self.endpoint("modem", options)
        return self.call(endpoint)

    def dhcp(self):
        self.debug("[+] fetching dhcp information")

        options = [
            "IPAddressRT",
            "SubnetMaskRT",
            "IPAddressGW",
            "DNSTblRT",
            "PoolEnable",
            "WanAddressMode"
        ]

        endpoint = self.endpoint("dhcp/v4/1", options)
        return self.call(endpoint)

    """
    def reset(self):
        # http://192.168.100.1/api/v1/reset
        # resetMta: true
        pass
    """

    def reboot(self):
        self.debug("[+] request full modem reboot")

        endpoint = self.endpoint("reset", [])

        data = {"reboot": "Router,Wifi,VoIP,Dect,MoCA"}
        request = self.session.post(endpoint, data=data)
        response = request.json()

        return response['error'] == 'ok'


if __name__ == '__main__':
    cm = TechnicolorCGA('voo', 'xxxxx')
    cm.login()

    system = cm.system()
    print(system)

    levels = cm.levels()
    print(levels)

    dhcp = cm.dhcp()
    print(dhcp)

    # cm.reboot()
