import datetime
import time
import random
import redis
import pymysql
import traceback
from config import dashconfig
from dashboard import DashboardSlave

class DashboardSensors():
    def __init__(self):
        self.sensors_last = {}
        self.sensors_id = dashconfig['sensors-id']

        self.power = {100: {
            'timestamp': 0,
            'value': 0,
        }}

        self.slave_sensors = DashboardSlave("sensors")
        self.slave_power = DashboardSlave("power")

    # dropped crappy ugly http server

    def remote_database(self):
        db = pymysql.connect(
            host=dashconfig['db-sensors-host'],
            user=dashconfig['db-sensors-user'],
            password=dashconfig['db-sensors-pass'],
            database=dashconfig['db-sensors-db'],
            autocommit=True
        )

        return db

    def power_summary_save(self, timewin, phase, value):
        db = self.remote_database()
        cursor = db.cursor(pymysql.cursors.DictCursor)

        data = {
            "timewin": timewin,
            "value": value,
            "phase": phase
        }

        print(f"[+] database: saving aggregated")
        cursor.execute("""
            INSERT IGNORE INTO power_summary (timewin, phase, value)
            VALUES (%(timewin)s, %(phase)s, %(value)s)

        """, data)

        db.close()


    def aggregate_watt_hour(self, key):
        items = self.aggregator.lrange(key, 0, -1)
        values = []

        for item in items:
            values.append(int(item))

        summed = sum(values)
        average = sum(values) / len(values)

        print(f"[+] {key}: summed {summed}, length: {len(values)}, average: {average} watt/hour")

        return int(average)

    def aggregate(self, phase, current):
        print(f"[+] aggregator: processing availables lists for phase: {phase}")

        exclude = f"dataset:power:{phase}:{current}"
        keys = self.aggregator.keys(f"dataset:power:{phase}:*")

        for key in keys:
            # skipping current time window
            if key == exclude:
                continue

            timewin = key.split(":")[3].replace(".", " ") + ":00:00"
            print(f"[+] processing: {key} [{timewin}]")

            watth = self.aggregate_watt_hour(key)
            self.power_summary_save(timewin, phase, watth)

            print(f"[+] {key}: removing computed key")
            self.aggregator.delete(key)

        return True

    def timekey(self, now=None):
        if now is None:
            now = datetime.datetime.now()

        return now.strftime("%Y-%m-%d.%H:00")

    #
    # sensors handlers
    #
    def handle_power(self, data):
        phase = int(data[2])
        value = int(data[3])
        timestamp = int(data[1])

        timekey = self.timekey()

        #
        # aggregate current hour values into redis list
        # and computing hour average on the next hour, average is pushed
        # into mariadb database (aggregated)
        #
        # aggregation reducing database from 6 GB (252M rows) to 5.5 MB (182k rows)
        #
        print(f"[+] power: phase {phase}: {timestamp}, group: {timekey}, value: {value} watt")
        length = self.aggregator.rpush(f"dataset:power:{phase}:{timekey}", value)

        if length == 1:
            print("[+] timekey: new list detected, starting aggregation")
            self.aggregate(phase, timekey)

        self.power[phase] = {
            'timestamp': int(timestamp),
            'value': float(value),
        }

        self.slave_power.set(self.power)
        self.slave_power.publish()

    def handle_ds18b20(self, data):
        name = data[2]
        value = int(data[3])
        timestamp = int(data[1])

        print("[+] sensors: %s (%s): value: %s" % (name, timestamp, value))

        db = self.remote_database()
        cursor = db.cursor()

        #
        # keep pushing temperature sensors into database directly
        #
        cursor.execute("SELECT id FROM sensors_devices WHERE devid = %s", (name,))
        if cursor.rowcount == 0:
            print("[-] short id not found on sensors_devices, inserting")
            cursor.execute("INSERT INTO sensors_devices (devid, NULL) VALUES (%s)", (name,))
            shortid = cursor.lastrowid

        else:
            shortid = cursor.fetchone()[0]

        print(f"[+] sensors: short id: {shortid}")

        rows = (shortid, int(timestamp), float(value))
        cursor.execute("""
            INSERT INTO sensors (id, timestamp, value) VALUES (%s, FROM_UNIXTIME(%s), %s)
        """, rows)

        self.sensors_last[name] = {
            'id': name,
            'timestamp': int(timestamp),
            'value': float(value),
        }

        self.slave_sensors.set(self.sensors_last)
        self.slave_sensors.publish()

        db.close()


    #
    # main consumer loop
    #
    def broker(self, name):
        return redis.Redis(dashconfig['redis-host'], dashconfig['redis-port'], decode_responses=True, client_name=name)

    def run(self):
        self.listener = self.broker("sensors-listener")
        self.aggregator = self.broker("sensors-aggregator")

        while True:
            message = self.listener.blpop(dashconfig['redis-network-list'], 10)
            if message is None:
                continue

            stripped = message[1].split(":")
            if stripped[0] == "power":
                self.handle_power(stripped)

            if stripped[0] == "ds18b20":
                self.handle_ds18b20(stripped)

    def loop(self):
        while True:
            try:
                sensors.run()

            except redis.exceptions.ConnectionError as error:
                print(f"[-] redis: connection lost: {error} attempting to reconnect")
                time.sleep(1)
                continue

            except Exception:
                print("[-] redis: unhandled exception, stopping")
                traceback.print_exc()
                return None

if __name__ == '__main__':
    sensors = DashboardSensors()
    sensors.loop()

