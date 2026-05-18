import requests
import time
from dashboard import DashboardSlave
from config import dashconfig as config

slave = DashboardSlave("wireless")

baseurl = f"http://{config['wireless-eap670']['host']}"

headers = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": baseurl,
}

loginfo = {
    "username": config["wireless-eap670"]["user"],
    "password": config["wireless-eap670"]["pass"],
}

s = requests.session()
response = s.post(baseurl, data=loginfo)
# print(response.headers)
# print(s.cookies)

while True:
    print("[+] wireless: updating")

    try:
        response = s.get(f"{baseurl}/data/status.device.json?operation=read&_={int(time.time() * 1000)}", headers=headers)
        # print(response.json())

        response = s.get(f"{baseurl}/data/status.client.user.json?operation=load&_={int(time.time() * 1000)}", headers=headers)
        table = response.json()

    except Exception as error:
        print(error)
        slave.sleep(10)
        continue

    # print(table)

    clients = {}

    for entry in table['data']:
        try:
            vlan = entry['IP'].split('.')[2]
            ckey = entry['MAC'].lower().replace("-", "") + f"-{vlan}"
            clients[ckey] = {
                "ip": entry['IP'],
                "hostname": entry['hostname'],
                "mac": entry['MAC'].lower().replace("-", ":"),
                "ssid": entry['SSID'],
                "rssi": entry['RSSI'],
                "rate": entry['Rate'],
                "down": entry['Down'],
                "up": entry['Up'],
                "active": entry['ActiveTime']
            }

        except Exception as e:
            print(e)

    print(slave.objdump(clients))

    payload = {
        'update': int(time.time()),
        'clients': clients
    }

    slave.set(payload)
    slave.publish()
    slave.sleep(10)
