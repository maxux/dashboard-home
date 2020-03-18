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

    def fetch(self, unit, retry=True):
        page = requests.get(self.baseurl + "/StatusClients.htm&&unit=%d&vap=0" % unit, cookies=self.jar)

        if 'action="/login.cgi"' in page.text:
            if not retry:
                return None

            self.login()
            return self.fetch(unit, False)

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
        self.clients = self.fetch(0)
        self.clients += self.fetch(1)

if __name__ == '__main__':
    lapac = LAPACMonitor("10.241.0.253", "admin", "admin")
    clients = lapac.allclients()
    print(clients)
