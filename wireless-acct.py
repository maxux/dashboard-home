import datetime
import time
import pymysql
import traceback
from config import dashconfig
from dashboard import DashboardSlave

def remote_database():
    db = pymysql.connect(
        host=dashconfig['wireless-db']['host'],
        user=dashconfig['wireless-db']['user'],
        password=dashconfig['wireless-db']['pass'],
        database=dashconfig['wireless-db']['base'],
        autocommit=True
    )

    return db


db = remote_database()
cursor = db.cursor(pymysql.cursors.DictCursor)
cursor.execute("""
    SELECT username, acctstarttime, acctstoptime, acctsessiontime,
           acctinputoctets, acctoutputoctets, callingstationid,
           acctterminatecause, framedipaddress
    FROM radacct
""")
for row in cursor.fetchall():
    username = row['username']
    macaddress = row['callingstationid'].replace("-", ":").lower()
    ipaddress = row['framedipaddress']
    rx = row['acctinputoctets'] / (1024 * 1024)
    tx = row['acctoutputoctets'] / (1024 * 1024)
    online = row['acctsessiontime'] / 60
    reason = row['acctterminatecause']

    print(f"{username: <10} | {macaddress} | {ipaddress} | {rx:.1f} MB | {tx:.1f} MB | {online: 6.1f} min | {reason}")

db.close()
