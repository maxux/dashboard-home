import pymysql
import json
from config import dashconfig

def remote_database():
    db = pymysql.connect(
        host=dashconfig['db-sensors-host'],
        user=dashconfig['db-sensors-user'],
        password=dashconfig['db-sensors-pass'],
        database=dashconfig['db-sensors-db'],
        autocommit=True
    )

    return db

data = {}

db = remote_database()
cursor = db.cursor(pymysql.cursors.DictCursor)
cursor.execute("""
    SELECT DATE_FORMAT(timewin, '%m-%d') xday, phase, sum(value) kwh FROM power_summary
    WHERE YEAR(timewin) = 2024 and phase = 2
    GROUP BY xday, phase
""")


for values in cursor.fetchall():
    data[values['xday']] = [values["xday"], int(values['kwh']), 0]

cursor.execute("""
    SELECT DATE_FORMAT(timewin, '%m-%d') xday, phase, sum(value) kwh FROM power_summary
    WHERE YEAR(timewin) = 2025 and phase = 2
    GROUP BY xday, phase
""")

for values in cursor.fetchall():
    data[values['xday']][2] = int(values['kwh'])

chart = []
for x in data:
    chart.append(data[x])

print(json.dumps(chart))
