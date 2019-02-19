import asyncio
import datetime
import time
import random
import websockets
import requests
import json
import sqlite3
import subprocess
import logging
import redis
import inspect
from sanic import Sanic
from sanic.response import json as sanicjson
from modules.netuse import *
from modules.voolevels import *
from modules.lapac import *
from config import dashconfig

class Dashboard():
    def __init__(self):
        # logging.basicConfig(level=logging.DEBUG)
        self.debuging = False

        self.timing = {}
        self.wsclients = set()
        self.weather = {}
        self.weather_short = {}
        self.sensors_last = {}
        self.sensors_id = dashconfig['sensors-id']
        self.sensors_dht_last = {}
        self.rtinfo = {}
        self.ping = {}
        self.bandwidth = {}
        self.ping = dashconfig['ping-targets']

        self.app = Sanic(__name__)
        self.db = sqlite3.connect(dashconfig['db-path'])

        self.redis = redis.Redis()

        self.monitor_wlz = LAPACMonitor(
            dashconfig['lapac-address'],
            dashconfig['lapac-username'],
            dashconfig['lapac-password']
        )

        self.devices = {}

        self.power_backlog = []
        self.power_backlog_days = []
        self.power = {1000: {
            'timestamp': 0,
            'value': 0,
        }}

        self.gpio = []
        self.docsis = {}

    def debug(self, message):
        if self.debuging:
            print(message)

    def uptrack(self):
        source = inspect.stack()[1][3]
        self.timing[source] = time.time()

        for entry in self.timing:
            diff = time.time() - self.timing[entry]
            print("[+] %-25s: %d seconds ago" % (entry, diff))

        print("[+] ---------------------------------------------")

    # privacy handler
    def privatefix(self, type, payload):
        if type == 'devices':
            clients = {}
            index = 0

            for client in payload:
                newclient = 'host-%d' % index
                clients[newclient] = payload[client]
                clients[newclient]['mac-address'] = 'xx:xx:xx:xx:xx:xx'
                clients[newclient]['hostname'] = '(filtered name)'

                index += 1

            return clients

        if type == 'wireless':
            clients = {}
            index = 0

            for client in payload:
                newclient = 'host-%d' % index
                clients[newclient] = payload[client]
                clients[newclient]['bssid'] = 'xx:xx:xx:xx:xx:xx'

            return clients

        if type == 'rtinfo':
            for index, value in enumerate(payload['rtinfo']):
                network = value['network']

                for nindex, nic in enumerate(network):
                    nic['ip'] = '0.0.0.0'
                    nic['name'] = 'filter'

            return payload

        return payload

    #
    # Websocket
    #
    async def wsbroadcast(self, type, payload):
        if not len(self.wsclients):
            return

        goodcontent = json.dumps({"type": type, "payload": payload})

        for client in list(self.wsclients):
            if not client.open:
                continue

            content = goodcontent

            # replacing payload with filtered contents if needed
            if not client.remote_address[0].startswith(dashconfig['trusted-prefix']):
                fixedpayload = self.privatefix(type, payload)
                content = json.dumps({"type": type, "payload": fixedpayload})

            try:
                await client.send(content)

            except Exception as e:
                print(e)

    async def wspayload(self, websocket, type, payload):
        if not websocket.remote_address[0].startswith(dashconfig['trusted-prefix']):
            payload = self.privatefix(type, payload)

        content = json.dumps({"type": type, "payload": payload})
        await websocket.send(content)

    async def handler(self, websocket, path):
        self.wsclients.add(websocket)

        print("[+] websocket: client connected")

        try:
            # pushing current data
            await self.wspayload(websocket, "weather", self.weather)
            await self.wspayload(websocket, "sensors", self.sensors_last)
            await self.wspayload(websocket, "sensors-dht", self.sensors_dht_last)
            await self.wspayload(websocket, "rtinfo", self.rtinfo)
            await self.wspayload(websocket, "devices", self.devices)
            await self.wspayload(websocket, "wireless", self.monitor_wlz.clients)
            await self.wspayload(websocket, "power", self.power)
            await self.wspayload(websocket, "power-backlog", self.power_backlog)
            await self.wspayload(websocket, "power-backlog-days", self.power_backlog_days)
            await self.wspayload(websocket, "gpio-status", self.gpio)
            await self.wspayload(websocket, "docsis-levels", self.docsis)

            for id in self.sensors_id:
                temp = {"id": id, "serie": self.sensors_backlog(id)}
                await self.wspayload(websocket, "sensors-backlog", temp)

            while True:
                if not websocket.open:
                    break

                await asyncio.sleep(1)

        finally:
            print("[+] websocket: client disconnected")
            self.wsclients.remove(websocket)


    def download(self, url):
        try:
            return requests.get(url, timeout=3).json()

        except Exception as e:
            print(e)
            return None

    #
    # Weather
    #
    async def weather_handler(self):
        print("[+] weather information: starting crawler")
        loop = asyncio.get_event_loop()

        def mb_req_stations():
            return self.download(dashconfig['weather-station'])

        def mb_req_rain():
            return self.download(dashconfig['weather-rain'])

        while True:
            self.debug("[+] weather information: fetching")
            self.uptrack()

            weather_future = loop.run_in_executor(None, mb_req_stations)
            response = await weather_future
            self.weather = response
            if not response:
                self.weather = {"temp": "-", "press": "-", "hum":"-", "dew":"-", "wind":0, "uv":"-", "widir":"-", "gust": None, "solar":"-"}

            weather_future = loop.run_in_executor(None, mb_req_rain)
            response = await weather_future
            if not response:
                continue

            self.weather['rain90min'] = response['rain_90min']
            self.weather['updated'] = int(time.time())

            # notify connected client
            self.debug("[+] weather information: %s, %s" % (self.weather['temp'], self.weather['press']))
            await self.wsbroadcast("weather", self.weather)

            await asyncio.sleep(5 * 60)

    #
    # rtinfo
    #
    async def rtinfo_handler(self):
        print("[+] rtinfo: starting crawler")
        loop = asyncio.get_event_loop()

        while True:
            self.debug("[+] rtinfo: fetching")
            self.uptrack()

            try:
                rtinfo_future = loop.run_in_executor(None, requests.get, dashconfig['rtinfo-endpoint'])
                response = await rtinfo_future
                self.rtinfo = response.json()

                self.debug("[+] rtinfo: %d hosts found" % len(self.rtinfo['rtinfo']))

                # notify connected client
                await self.wsbroadcast("rtinfo", self.rtinfo)

            except Exception as e:
                print(e)

            await asyncio.sleep(1)

    #
    # ping
    #
    async def ping_handler(self, target):
        print("[+] ping checker: starting %s" % target)
        ping = RootPing()
        loop = asyncio.get_event_loop()

        while True:
            self.debug("[+] ping checker: pinging %s" % target)
            ping_future = loop.run_in_executor(None, ping.ping_host, self.ping[target]['target'])
            value = await ping_future
            self.ping[target]['value'] = value
            self.debug("[+] ping checker: %s, %s" % (target, value))

            await self.wsbroadcast("ping", {"name": target, "data": self.ping[target]})
            await asyncio.sleep(2)

    #
    # local network monitor
    #
    async def local_devices_handler(self):
        print("[+] local devices checker: starting crawler")

        monitor_dhcp = DHCPMonitor(None)
        monitor_arp  = ARPMonitor(None, ["lan"])

        while True:
            self.debug("[+] local (dhcp) devices checker: updating")
            self.uptrack()

            devices = {}

            dhclients = self.redis.keys('dhcp-*')
            for client in dhclients:
                payload = self.redis.get(client).decode('utf-8')
                keyname = client.decode('utf-8')[5:]

                devices[keyname] = json.loads(payload)

            clients = self.redis.keys('traffic-*')
            for client in clients:
                payload = self.redis.get(client).decode('utf-8')
                live = json.loads(payload)

                # ignore inactive client
                if live['active'] < time.time() - (4 * 3600):
                    continue

                dhcpfound = False

                for device in devices:
                    if devices[device]['ip-address'] == live['addr']:
                        devices[device]['rx'] = live['rx']
                        devices[device]['tx'] = live['tx']
                        devices[device]['timestamp'] = live['active']
                        dhcpfound = True
                        break

                if not dhcpfound:
                    devices[live['addr']] = {
                        "timestamp": live['active'],
                        "mac-address": live['macaddr'],
                        "hostname": live['host'],
                        "ip-address": live['addr'],
                        "rx": live['rx'],
                        "tx": live['tx'],
                    }

            self.debug("[+] local devices checker: %d devices found" % len(devices))
            self.devices = devices

            await self.wsbroadcast("devices", self.devices)
            await asyncio.sleep(1)


    async def wireless_handler(self):
        print("[+] wireless: starting crawler")
        loop = asyncio.get_event_loop()

        while True:
            self.debug("[+] wireless: updating")
            self.uptrack()

            wireless_future = loop.run_in_executor(None, self.monitor_wlz.allclients)
            response = await wireless_future

            self.debug("[+] wireless: %d clients found" % len(self.monitor_wlz.clients))

            # print(self.monitor_wlz.clients)
            await self.wsbroadcast("wireless", self.monitor_wlz.clients)

            await asyncio.sleep(2)


    #
    # sensors
    #
    async def power_backlog_handler(self):
        print("[+] power backlogger: starting crawler")
        loop = asyncio.get_event_loop()

        while True:
            self.debug("[+] power backlogger: fetching 24h")
            self.uptrack()

            yesterday = datetime.datetime.fromtimestamp(time.time() - 86400)
            yesterday = yesterday.replace(minute=0, second=0)
            limit = int(time.mktime(yesterday.timetuple())) + 3600

            # Today
            cursor = self.db.cursor()
            '''
            cursor.execute("""
                select byhour, sum(val) from (
                    select strftime('%m-%d %Hh', timestamp, 'unixepoch', 'localtime') byhour, avg(value) val, phase
                    from power where timestamp > ? group by byhour, phase
                ) group by byhour;
            """, (limit,))
            '''
            cursor.execute("""
                select strftime('%m-%d %Hh', timestamp, 'unixepoch', 'localtime') byhour, avg(value) val
                from power where timestamp > ? and phase = 2 group by byhour
            """, (limit,))

            backlog = cursor.fetchall()
            parsed = []

            for values in backlog:
                parsed.append([values[0][6:], values[1]])

            self.power_backlog = parsed

            await self.wsbroadcast("power-backlog", self.power_backlog)

            # 30 days backlog
            self.debug("[+] power backlogger: fetching 70 days")
            cursor = self.db.cursor()
            '''
            cursor.execute("""
                -- select sum of hours, per day
                select strftime('%Y-%m-%d', byhour) byday, sum(av) from (
                    -- select full average per hour (sum phases)
                    select byhour, sum(av) av from (
                        -- select average per hour, per phase
                        select strftime('%Y-%m-%d %H:00:00', timestamp, 'unixepoch', 'localtime') byhour, avg(value) av, phase
                        from power where date(timestamp, 'unixepoch') > date('now', '-30 days') group by byhour, phase
                    ) group by byhour
                ) group by byday;
            """)
            cursor.execute("""
                -- select sum of hours, per day
                select strftime('%Y-%m-%d', byhour) byday, sum(av) from (
                    -- select average per hour
                    select strftime('%Y-%m-%d %H:00:00', timestamp, 'unixepoch', 'localtime') byhour, avg(value) av
                    from power where date(timestamp, 'unixepoch') > date('now', '-30 days') and phase = 2 group by byhour
                ) group by byday;
            """)
            '''
            cursor.execute("""
                select strftime('%Y-%m-%d', byhour) byday, phase, sum(av) from (
                    select strftime('%Y-%m-%d %H:00:00', timestamp, 'unixepoch', 'localtime') byhour, avg(value) av, phase
                    from power where date(timestamp, 'unixepoch') > date('now', '-30 days') group by byhour, phase
                ) group by byday, phase;
            """)

            backlog = cursor.fetchall()

            self.power_backlog_days = backlog

            await self.wsbroadcast("power-backlog-days", self.power_backlog_days)
            await asyncio.sleep(5 * 60)

    async def local_gpio_circuits(self):
        print("[+] gpio status: starting crawler")
        loop = asyncio.get_event_loop()

        while True:
            self.debug("[+] gpio status: fetching")
            self.uptrack()


            # power circuits channels
            gpio_future = loop.run_in_executor(None, requests.get, "%s/items" % dashconfig['muxberrypi-endpoint'])
            response = await gpio_future
            self.gpio = response.json()

            gpio_future = loop.run_in_executor(None, requests.get, "%s/status" % dashconfig['muxberrypi-endpoint'])
            response = await gpio_future
            gpiostatus = response.json()

            for key, item in enumerate(gpiostatus['gpio']):
                self.gpio[key]['value'] = item['value']

            self.debug("[+] gpio status: %d keys fetched" % len(self.gpio))
            await self.wsbroadcast("gpio-status", self.gpio)
            await asyncio.sleep(10)

    async def voo_levels(self):
        print("[+] voo level: starting crawler")
        loop = asyncio.get_event_loop()

        while True:
            self.debug("[+] voo levels: fetching new values")
            self.uptrack()

            levels = SignalLevel(dashconfig['voo-address'], dashconfig['voo-password'])

            try:
                voo_future = loop.run_in_executor(None, levels.fetch)

                response = await voo_future
                if response:
                    self.docsis = {'up': levels.upstream, 'down': levels.downstream}

                    docsisaverage = 0.0
                    for ups in self.docsis['up']:
                        docsisaverage += ups['txpower']

                    self.debug("[+] voo levels: upstream ~%.2f dBmV" % (docsisaverage / len(self.docsis['up'])))

                await self.wsbroadcast("docsis-levels", self.docsis)

            except Exception as e:
                print(e)

            await asyncio.sleep(10)

    def sensors_backlog(self, id):
        limit = 600

        cursor = self.db.cursor()
        rows = (id, limit)
        cursor.execute("select timestamp, value from sensors where id=? order by timestamp desc limit ?", rows)

        backlog = cursor.fetchall()

        array = []

        for entry in backlog:
            array.append([entry[0] * 1000, entry[1]])

        return array

    def httpd_routes(self, app):
        @app.route("/sensors/<name>/<timestamp>/<value>")
        async def httpd_routes_index(request, name, timestamp, value):
            self.debug("[+] sensors: %s (%s): value: %s" % (name, timestamp, value))

            cursor = self.db.cursor()
            rows = (name, int(timestamp), float(value))
            cursor.execute("INSERT INTO sensors (id, timestamp, value) VALUES (?, ?, ?)", rows)
            self.db.commit()

            self.sensors_last[name] = {
                'id': name,
                'timestamp': int(timestamp),
                'value': float(value),
            }

            # update sensors stats
            await self.wsbroadcast("sensors", self.sensors_last)

            # pushing chart
            temp = {"id": name, "serie": self.sensors_backlog(name)}
            await self.wsbroadcast("sensors-backlog", temp)

            return sanicjson({})

        @app.route("/sensors-dht/<name>/<timestamp>/<temperature>/<humidity>")
        async def httpd_routes_dht(request, name, timestamp, temperature, humidity):
            self.debug("[+] sensors: %s (%s): temperature: %s, humidity: %s" % (name, timestamp, temperature, humidity))

            cursor = self.db.cursor()
            rows = (name, int(timestamp), float(temperature), float(humidity))
            cursor.execute("INSERT INTO dht (id, timestamp, temp, hum) VALUES (?, ?, ?, ?)", rows)
            self.db.commit()

            self.sensors_dht_last[name] = {
                'id': name,
                'timestamp': int(timestamp),
                'temperature': float(temperature),
                'humidity': float(humidity),
            }

            # update sensors stats
            await self.wsbroadcast("sensors-dht", self.sensors_dht_last)

            """
            # pushing chart
            temp = {"id": name, "serie": self.sensors_backlog(name)}
            await self.wsbroadcast("sensors-backlog", temp)
            """

            return sanicjson({})


        @app.route("/power/<timestamp>/<value>")
        async def httpd_routes_power(request, timestamp, value):
            self.debug("[+] power: %s watt at %s" % (value, timestamp))

            cursor = self.db.cursor()
            rows = (int(timestamp), float(value))
            cursor.execute("INSERT OR IGNORE INTO power (timestamp, value, phase) VALUES (?, ?, 1000)", rows)
            self.db.commit()

            self.power["1000"] = {
                'timestamp': int(timestamp),
                'value': float(value),
            }

            # update sensors stats
            await self.wsbroadcast("power", self.power)

            # pushing chart
            # temp = {"id": name, "serie": self.sensors_backlog(name)}
            # await self.wsbroadcast("sensors-backlog", temp)

            return sanicjson({})

        @app.route("/power/<timestamp>/<phase>/<value>")
        async def httpd_routes_power(request, timestamp, phase, value):
            self.debug("[+] power: phase %s: %s watt at %s" % (phase, value, timestamp))

            cursor = self.db.cursor()
            rows = (int(timestamp), float(value), int(phase))
            cursor.execute("INSERT OR IGNORE INTO power (timestamp, value, phase) VALUES (?, ?, ?)", rows)
            self.db.commit()

            self.power[phase] = {
                'timestamp': int(timestamp),
                'value': float(value),
            }

            # update sensors stats
            await self.wsbroadcast("power", self.power)

            # pushing chart
            # temp = {"id": name, "serie": self.sensors_backlog(name)}
            # await self.wsbroadcast("sensors-backlog", temp)

            return sanicjson({})



    def prefetch(self):
        cursor = self.db.cursor()
        cursor.execute("select id, max(timestamp) mx, value from sensors group by id")

        sensors = cursor.fetchall()
        for sensor in sensors:
            id = sensor[0]
            self.sensors_last[id] = {
                'id': sensor[0],
                'timestamp': sensor[1],
                'value': sensor[2],
            }

    def run(self):
        #
        # standard polling handlers
        #
        loop = asyncio.get_event_loop()
        loop.set_debug(True)

        asyncio.ensure_future(self.weather_handler())
        asyncio.ensure_future(self.rtinfo_handler())
        asyncio.ensure_future(self.wireless_handler())
        asyncio.ensure_future(self.local_devices_handler())
        asyncio.ensure_future(self.power_backlog_handler())
        asyncio.ensure_future(self.local_gpio_circuits())
        asyncio.ensure_future(self.voo_levels())

        #
        # ping services
        #
        for target in self.ping:
            asyncio.ensure_future(self.ping_handler(target))

        #
        # http receiver
        # will receive message from restful request
        # this will updates sensors status
        #
        self.httpd_routes(self.app)
        httpd = self.app.create_server(host=dashconfig['http-listen-addr'], port=dashconfig['http-listen-port'], loop=loop)
        asyncio.ensure_future(httpd, loop=loop)

        #
        # handle websocket communication
        #
        websocketd = websockets.serve(self.handler, dashconfig['ws-listen-addr'], dashconfig['ws-listen-port'])
        asyncio.ensure_future(websocketd, loop=loop)

        #
        # main loop, let's run everything together
        #
        loop.run_forever()

dashboard = Dashboard()
dashboard.prefetch()
dashboard.run()
