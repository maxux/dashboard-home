import time
import pymysql
from modules.lapac import *
from config import dashconfig
from dashboard import DashboardSlave

slave = DashboardSlave("wireless")

monitor = LAPACMonitor(
    dashconfig['lapac-address'],
    dashconfig['lapac-username'],
    dashconfig['lapac-password']
)

while True:
    print("[+] wireless: updating")

    try:
        response = monitor.allclients()
        print("[+] wireless: %d clients found" % len(monitor.clients))

    except Exception as e:
        print(e)

    db = pymysql.connect(
        host=dashconfig['wireless-db']['host'],
        user=dashconfig['wireless-db']['user'],
        password=dashconfig['wireless-db']['pass'],
        database=dashconfig['wireless-db']['base'],
        autocommit=True
    )

    cursor = db.cursor()
    cursor.execute("SELECT username, callingstationid FROM radacct")

    for row in cursor.fetchall():
        for client in monitor.clients:
            if row[1].replace("-", "") == client['address'].replace(":", ""):
                client["login"] = row[0]

    payload = {
        'update': int(time.time()),
        'clients': monitor.clients
    }

    slave.set(payload)
    slave.publish()
    slave.sleep(2)

