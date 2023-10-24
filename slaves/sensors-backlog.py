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
        self.power_backlog = []
        self.power_backlog_days = []

        self.slave_sensors = DashboardSlave("sensors-backlog")
        self.slave_power_backlog = DashboardSlave("power-backlog")
        self.slave_power_backlog_days = DashboardSlave("power-backlog-days")

    def remote_database_cursor(self):
        db_sensors = pymysql.connect(
            host=dashconfig['db-sensors-host'],
            user=dashconfig['db-sensors-user'],
            password=dashconfig['db-sensors-pass'],
            database=dashconfig['db-sensors-db'],
            autocommit=True
        )

        return db_sensors.cursor()

    def power_backlog_fetch(self):
        print("[+] power backlogger: fetching 24h")

        yesterday = datetime.datetime.fromtimestamp(time.time() - 86400)
        yesterday = yesterday.replace(minute=0, second=0)
        limit = int(time.mktime(yesterday.timetuple())) + 3600

        # Today
        cursor = self.remote_database_cursor()
        ''' sqlite
        cursor.execute("""
            select strftime('%m-%d %Hh', timestamp, 'unixepoch', 'localtime') byhour, avg(value) val
            from power where timestamp > ? and phase = 2 group by byhour
        """, (limit,))
        '''

        # mysql
        cursor.execute("""
            SELECT DATE_FORMAT(timestamp, '%%m-%%d %%Hh') byhour, AVG(value) val
            FROM power WHERE timestamp > FROM_UNIXTIME(%s) AND phase = 2 GROUP BY byhour
        """, (limit,))

        backlog = cursor.fetchall()
        parsed = []

        for values in backlog:
            parsed.append([values[0][6:], int(values[1])])


        self.slave_power_backlog.set(parsed)
        self.slave_power_backlog.publish()

        # 30 days backlog
        print("[+] power backlogger: fetching 30 days")
        cursor = self.remote_database_cursor()
        ''' sqlite
        cursor.execute("""
            select strftime('%Y-%m-%d', byhour) byday, phase, sum(av) from (
                select strftime('%Y-%m-%d %H:00:00', timestamp, 'unixepoch', 'localtime') byhour, avg(value) av, phase
                from power where date(timestamp, 'unixepoch') > date('now', '-30 days') group by byhour, phase
            ) group by byday, phase;
        """)
        '''

        # mysql
        cursor.execute("""
            SELECT DATE_FORMAT(byhour, '%Y-%m-%d') byday, phase, SUM(av) FROM (
                SELECT DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') byhour, AVG(value) av, phase
                FROM power WHERE timestamp > CURRENT_DATE - INTERVAL 30 DAY GROUP BY byhour, phase
            ) x GROUP BY byday, phase
        """)

        backlog = cursor.fetchall()
        parsed = []

        for values in backlog:
            parsed.append([values[0], int(values[1]), int(values[2])])

        self.slave_power_backlog_days.set(parsed)
        self.slave_power_backlog_days.publish()

    def sensors_backlog(self, id):
        limit = 600

        cursor = self.remote_database_cursor()
        rows = (id, limit)
        cursor.execute("""
            SELECT UNIX_TIMESTAMP(timestamp), value FROM sensors
            WHERE id = %s ORDER BY timestamp DESC LIMIT %s
        """, rows)

        array = []

        for entry in cursor.fetchall():
            array.append([entry[0] * 1000, entry[1] / 1000])

        return array

    def run(self):
        while True:
            for name in self.sensors:
                print("[+] sensors backlog: fetching [%s]" % name)
                self.slave_sensors.set({"id": name, "serie": self.sensors_backlog(name)})
                self.slave_sensors.publish()

            self.power_backlog_fetch()

            print("[+] done, waiting next time")
            time.sleep(5 * 60)

if __name__ == '__main__':
    backlog = DashboardBacklog()
    backlog.run()
