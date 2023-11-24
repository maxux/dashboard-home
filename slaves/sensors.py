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
from flask import Flask, request, session, redirect, render_template, abort, make_response, jsonify, g
from config import dashconfig
from dashboard import DashboardSlave

class DashboardSensors():
    def __init__(self):
        self.sensors_last = {}
        self.sensors_id = dashconfig['sensors-id']

        self.app = Flask("dashboard-sensors")

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
        def httpd_routes_sensor(name, timestamp, value):
            print("[+] sensors: %s (%s): value: %s" % (name, timestamp, value))

            cursor = self.remote_database_cursor()

            rows = (name)
            cursor.execute("SELECT value, timestamp FROM sensors WHERE id = %s ORDER BY timestamp DESC LIMIT 1", rows)
            previous = cursor.fetchone()
            if previous != None:
                timediff = int(time.time()) - int(datetime.datetime.timestamp(previous[1]))
                valdiff = abs(previous[0] - int(value))

                # if time differs more than 5 min, ignoring difference of temperature
                if timediff < 300:
                    if valdiff > 5000:
                        print(f"[-] discarding value, temperature difference too high [{valdiff}]")
                        return jsonify({})

            rows = (name, int(timestamp), float(value))
            cursor.execute("INSERT INTO sensors (id, timestamp, value) VALUES (%s, FROM_UNIXTIME(%s), %s)", rows)

            self.sensors_last[name] = {
                'id': name,
                'timestamp': int(timestamp),
                'value': float(value),
            }

            self.slave_sensors.set(self.sensors_last)
            self.slave_sensors.publish()

            return jsonify({})

        @app.route("/power/<timestamp>/<value>")
        def httpd_routes_power(timestamp, value):
            print("[+] power: %s watt at %s" % (value, timestamp))

            cursor = self.remote_database_cursor()
            rows = (int(timestamp), int(value))
            cursor.execute("INSERT IGNORE INTO power (timestamp, value, phase) VALUES (FROM_UNIXTIME(%s), %s, 1000)", rows)

            self.power["1000"] = {
                'timestamp': int(timestamp),
                'value': float(value),
            }

            self.slave_power.set(self.power)
            self.slave_power.publish()

            return jsonify({})

        @app.route("/power/<timestamp>/<phase>/<value>")
        def httpd_routes_power_phase(timestamp, phase, value):
            print("[+] power: phase %s: %s watt at %s" % (phase, value, timestamp))

            cursor = self.remote_database_cursor()
            rows = (int(timestamp), int(value), int(phase))
            cursor.execute("INSERT IGNORE INTO power (timestamp, value, phase) VALUES (FROM_UNIXTIME(%s), %s, %s)", rows)

            self.power[phase] = {
                'timestamp': int(timestamp),
                'value': float(value),
            }

            self.slave_power.set(self.power)
            self.slave_power.publish()

            return jsonify({})

    def run(self):
        self.httpd_routes(self.app)
        self.app.run(host=dashconfig['http-listen-addr'], port=dashconfig['http-listen-port'], debug=True, threaded=True)

if __name__ == '__main__':
    sensors = DashboardSensors()
    sensors.run()
