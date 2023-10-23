import asyncio
import datetime
import time
import random
import requests
import json
import sqlite3
import subprocess
import logging
import redis
import inspect
import pymysql
from sanic import Sanic
from sanic.response import json as sanicjson
from config import dashconfig
from dashboard import DashboardSlave

class DashboardSensors():
    def __init__(self):
        self.sensors_last = {}
        self.sensors_id = dashconfig['sensors-id']
        self.sensors_dht_last = {}

        self.app = Sanic(__name__)

        self.db_power = sqlite3.connect(dashconfig['db-power-path'])

        self.power = {1000: {
            'timestamp': 0,
            'value': 0,
        }}

        self.slave_sensors = DashboardSlave("sensors")
        self.slave_power = DashboardSlave("power")

    def remote_database_cursor(self):
        db_sensors = pymysql.connect(
            host=dashconfig['db-sensors-host'],
            user=dashconfig['db-sensors-user'],
            password=dashconfig['db-sensors-pass'],
            database=dashconfig['db-sensors-db'],
            autocommit=True
        )

        return db_sensors.cursor()

    def httpd_routes(self, app):
        @app.route("/sensors/<name>/<timestamp>/<value>")
        async def httpd_routes_index(request, name, timestamp, value):
            print("[+] sensors: %s (%s): value: %s" % (name, timestamp, value))

            cursor = self.remote_database_cursor()
            rows = (name, int(timestamp), float(value))
            cursor.execute("INSERT INTO sensors (id, timestamp, value) VALUES (%s, FROM_UNIXTIME(%s), %s)", rows)

            self.sensors_last[name] = {
                'id': name,
                'timestamp': int(timestamp),
                'value': float(value),
            }

            self.slave_sensors.set(self.sensors_last)
            self.slave_sensors.publish()

            """
            # pushing chart
            temp = {"id": name, "serie": self.sensors_backlog(name)}
            await self.wsbroadcast("sensors-backlog", temp)
            """

            return sanicjson({})

        '''
        @app.route("/sensors-dht/<name>/<timestamp>/<temperature>/<humidity>")
        async def httpd_routes_dht(request, name, timestamp, temperature, humidity):
            print("[+] sensors: %s (%s): temperature: %s, humidity: %s" % (name, timestamp, temperature, humidity))

            cursor = self.db_sensors.cursor()
            rows = (name, int(timestamp), float(temperature), float(humidity))
            cursor.execute("INSERT INTO dht (id, timestamp, temp, hum) VALUES (?, ?, ?, ?)", rows)
            self.db_sensors.commit()

            self.sensors_dht_last[name] = {
                'id': name,
                'timestamp': int(timestamp),
                'temperature': float(temperature),
                'humidity': float(humidity),
            }

            self.slave_sensors_dht.set(self.sensors_dht_last)
            self.slave_sensors_dht.publish()

            """
            # pushing chart
            temp = {"id": name, "serie": self.sensors_backlog(name)}
            await self.wsbroadcast("sensors-backlog", temp)
            """

            return sanicjson({})
        '''

        @app.route("/power/<timestamp>/<value>")
        async def httpd_routes_power(request, timestamp, value):
            print("[+] power: %s watt at %s" % (value, timestamp))

            cursor = self.db_power.cursor()
            rows = (int(timestamp), float(value))
            cursor.execute("INSERT OR IGNORE INTO power (timestamp, value, phase) VALUES (?, ?, 1000)", rows)
            self.db_power.commit()

            self.power["1000"] = {
                'timestamp': int(timestamp),
                'value': float(value),
            }

            self.slave_power.set(self.power)
            self.slave_power.publish()

            # pushing chart
            # temp = {"id": name, "serie": self.sensors_backlog(name)}
            # await self.wsbroadcast("sensors-backlog", temp)

            return sanicjson({})

        @app.route("/power/<timestamp>/<phase>/<value>")
        async def httpd_routes_power(request, timestamp, phase, value):
            print("[+] power: phase %s: %s watt at %s" % (phase, value, timestamp))

            cursor = self.db_power.cursor()
            rows = (int(timestamp), float(value), int(phase))
            cursor.execute("INSERT OR IGNORE INTO power (timestamp, value, phase) VALUES (?, ?, ?)", rows)
            self.db_power.commit()

            self.power[phase] = {
                'timestamp': int(timestamp),
                'value': float(value),
            }

            self.slave_power.set(self.power)
            self.slave_power.publish()

            # pushing chart
            # temp = {"id": name, "serie": self.sensors_backlog(name)}
            # await self.wsbroadcast("sensors-backlog", temp)

            return sanicjson({})

    def run(self):
        self.httpd_routes(self.app)
        self.app.run(host=dashconfig['http-listen-addr'], port=dashconfig['http-listen-port'])

if __name__ == '__main__':
    sensors = DashboardSensors()
    sensors.run()
