import datetime
import time
import random
import json
import sqlite3
from config import dashconfig
from dashboard import DashboardSlave

class DashboardBacklog():
    def __init__(self):
        self.db_sensors = sqlite3.connect(dashconfig['db-sensors-path'])
        self.db_power = sqlite3.connect(dashconfig['db-power-path'])

        self.sensors = dashconfig['sensors-id']
        self.power_backlog = []
        self.power_backlog_days = []

        self.slave_sensors = DashboardSlave("sensors-backlog")
        self.slave_power_backlog = DashboardSlave("power-backlog")
        self.slave_power_backlog_days = DashboardSlave("power-backlog-days")

    def power_backlog_fetch(self):
        print("[+] power backlogger: fetching 24h")

        yesterday = datetime.datetime.fromtimestamp(time.time() - 86400)
        yesterday = yesterday.replace(minute=0, second=0)
        limit = int(time.mktime(yesterday.timetuple())) + 3600

        # Today
        cursor = self.db_power.cursor()
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


        self.slave_power_backlog.set(parsed)
        self.slave_power_backlog.publish()

        # 30 days backlog
        print("[+] power backlogger: fetching 30 days")
        cursor = self.db_power.cursor()
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

        self.slave_power_backlog_days.set(backlog)
        self.slave_power_backlog_days.publish()

    def sensors_backlog(self, id):
        limit = 600

        cursor = self.db_sensors.cursor()
        rows = (id, limit)
        cursor.execute("select timestamp, value from sensors where id=? order by timestamp desc limit ?", rows)

        backlog = cursor.fetchall()

        array = []

        for entry in backlog:
            array.append([entry[0] * 1000, entry[1]])

        return array

    def run(self):
        while True:
            for name in self.sensors:
                print("[+] sensors backlog: fetching [%s]" % name)
                self.slave_sensors.set({"id": name, "serie": self.sensors_backlog(name)})
                self.slave_sensors.publish()

            self.power_backlog_fetch()

            time.sleep(5 * 60)

if __name__ == '__main__':
    backlog = DashboardBacklog()
    backlog.run()
