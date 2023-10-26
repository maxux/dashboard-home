from lxml import html
import requests

class LAPACMonitor:
    def __init__(self, host, username, password):
        self.host = host
        self.username = username
        self.password = password

        self.clients = []

        self.baseurl = "http://%s" % self.host
        self.jar = requests.cookies.RequestsCookieJar()

    def login(self):
        creds = {
            'login_name': self.username,
            'login_pwd': self.password,
            'todo': 'login',
            'this_file': 'login.htm',
            'next_file': 'Menu_Status.htm'
        }

        attempt = requests.post(self.baseurl + "/login.cgi", data=creds)
        self.jar = attempt.cookies

    def fetch_clients(self, unit, retry=True):
        page = requests.get(self.baseurl + "/StatusClients.htm&&unit=%d&vap=0" % unit, cookies=self.jar)

        if 'action="/login.cgi"' in page.text:
            if not retry:
                return None

            self.login()
            return self.fetch_clients(unit, False)

        tree = html.fromstring(page.content)

        rawclients = tree.xpath('//tr/td/text()')[4:-1]
        clients = []

        for index in range(int(len(rawclients) / 6)):
            zone = index * 6

            clients.append({
                'ssid': rawclients[zone],
                'address': rawclients[zone + 1],
                'ssidmac': rawclients[zone + 2],
                'linkrate': float(rawclients[zone + 3]),
                'rssi': float(rawclients[zone + 4]),
                'online': int(rawclients[zone + 5])
            })

        return clients

    def allclients(self):
        self.clients = self.fetch_clients(0)
        self.clients += self.fetch_clients(1)

    def statistics(self, unit, retry=True):
        page = requests.get(self.baseurl + "/StatusStat.htm&unit=%d" % unit, cookies=self.jar)

        if 'action="/login.cgi"' in page.text:
            if not retry:
                return None

            self.login()
            return self.statistics(unit, False)

        tree = html.fromstring(page.content)

        rawclients = tree.xpath('//tr/td/text()')[4:-1]
        ssids = {}

        index = 4
        direction = "transmit"

        while index < len(rawclients):
            if rawclients[index + 1] == "Interface":
                direction = "receive"
                index += 7
                continue

            if rawclients[index] not in ssids:
                ssids[rawclients[index]] = {
                    "transmit": {},
                    "receive": {},
                }

            ssids[rawclients[index]][direction] = {
                'packets': int(rawclients[index + 1].replace(",", "")),
                'bytes': int(rawclients[index + 2].replace(",", "")),
                'packets-dropped': int(rawclients[index + 3].replace(",", "")),
                'bytes-dropped': int(rawclients[index + 4].replace(",", "")),
                'errors': int(rawclients[index + 5].replace(",", "")),
            }

            index += 6

        return ssids

    def allstats(self):
        radio = [self.statistics(0)]
        radio.append(self.statistics(1))

        return radio

if __name__ == '__main__':
    lapac = LAPACMonitor("10.241.0.253", "admin", "admin")
    clients = lapac.allclients()
    print(clients)
