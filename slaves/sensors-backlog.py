import datetime
import time
import random
import json
import sqlite3
import pymysql
from config import dashconfig
from dashboard import DashboardSlave

class DashboardBacklog():
    def __init__(self):
        self.sensors = dashconfig['sensors-id']
        self.sensorsgrp = dashconfig['sensors-group']
        self.power_backlog = []
        self.power_backlog_days = []

        self.slave_sensors = DashboardSlave("sensors-backlog")
        self.slave_power_backlog = DashboardSlave("power-backlog")
        self.slave_power_backlog_days = DashboardSlave("power-backlog-days")

    def remote_database(self):
        db = pymysql.connect(
            host=dashconfig['db-sensors-host'],
            user=dashconfig['db-sensors-user'],
            password=dashconfig['db-sensors-pass'],
            database=dashconfig['db-sensors-db'],
            autocommit=True
        )

        return db

    def power_backlog_fetch(self):
        print("[+] power backlogger: fetching 24h")

        db = self.remote_database()

        # Today
        cursor = db.cursor()
        cursor.execute("""
            SELECT DATE_FORMAT(timewin, '%m-%d %Hh') byhour, value
            FROM power_summary
            WHERE timewin > CURRENT_TIMESTAMP - INTERVAL 24 HOUR
              AND phase = 2
        """)

        backlog = cursor.fetchall()
        parsed = []

        for values in backlog:
            parsed.append([values[0][6:], values[1] / 1000])

        self.slave_power_backlog.set(parsed)
        self.slave_power_backlog.publish()

        # 30 days backlog
        print("[+] power backlogger: fetching 30 days")
        cursor = db.cursor(pymysql.cursors.DictCursor)
        cursor.execute("""
            SELECT DATE_FORMAT(timewin, '%Y-%m-%d') xday, phase, sum(value) kwh FROM power_summary
            WHERE timewin > CURRENT_DATE - INTERVAL 30 DAY
            GROUP BY xday, phase
        """)

        accumulator = 0
        parsed = []

        for values in cursor.fetchall():
            kwh = float(values['kwh'] / 1000)

            # reset accumulator on phase 0
            if values['phase'] == 0:
                accumulator = 0

            # add kwh to accumulator for phase 0 and phase 1
            if values['phase'] < 2:
                accumulator += kwh

            # phase 2 is the total
            # substracting accumulator from the total to get phase 2
            if values['phase'] == 2:
                kwh -= accumulator

            # now it's nicely stackable
            parsed.append([values['xday'], int(values['phase']), kwh])

        self.slave_power_backlog_days.set(parsed)
        self.slave_power_backlog_days.publish()

        db.close()

    def sensors_backlog(self, id):
        limit = 600

        db = self.remote_database()
        cursor = db.cursor()

        rows = (id, limit)
        cursor.execute("""
            SELECT UNIX_TIMESTAMP(timestamp), value FROM sensors
            WHERE id = (SELECT id FROM sensors_devices WHERE devid = %s)
            ORDER BY timestamp DESC LIMIT %s
        """, rows)

        array = []

        for entry in cursor.fetchall():
            array.append([entry[0] * 1000, entry[1] / 1000])

        db.close()

        return [array]

    def sensors_group_backlog(self, id):
        series = []

        db = self.remote_database()
        cursor = db.cursor()

        for nid in self.sensorsgrp[id]:
            cursor.execute("""
                SELECT UNIX_TIMESTAMP(timestamp), value FROM sensors
                WHERE id = (SELECT id FROM sensors_devices WHERE devid = %s)
                AND timestamp > CURRENT_TIMESTAMP - INTERVAL 14 HOUR
                ORDER BY timestamp DESC
            """, (nid))

            array = []

            for entry in cursor.fetchall():
                array.append([entry[0] * 1000, entry[1] / 1000])

            series.append({"data": array})

        db.close()

        return series

    def run(self):
        while True:
            for name in self.sensors:
                if name in self.sensorsgrp:
                    print("[+] sensors backlog: fetching group [%s]" % name)
                    self.slave_sensors.set({"id": name, "serie": self.sensors_group_backlog(name)})
                    self.slave_sensors.publish()

                else:
                    print("[+] sensors backlog: fetching [%s]" % name)
                    self.slave_sensors.set({"id": name, "serie": self.sensors_backlog(name)})
                    self.slave_sensors.publish()

            self.power_backlog_fetch()

            print("[+] done, waiting next time")
            time.sleep(5 * 60)

if __name__ == '__main__':
    backlog = DashboardBacklog()
    backlog.run()
