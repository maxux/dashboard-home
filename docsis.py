from modules.voolevels import *
from modules.voocga import *
from config import dashconfig
from dashboard import DashboardSlave

slave = DashboardSlave("docsis-levels")
levels = TechnicolorCGA(dashconfig['voo-username'], dashconfig['voo-password'])

while True:
    print("[+] voo levels: fetching new values")

    if not levels.logged:
        levels.login()

    try:
        response = levels.levels()
        if response:
            upstream = response['USTbl']
            downstream = response['DSTbl']

            for a in upstream:
                a['txpower'] = float(a['PowerLevel'].split()[0])

            slave.set({'up': upstream, 'down': downstream})

            docsisaverage = 0.0
            for ups in slave.payload['up']:
                docsisaverage += ups['txpower']

            print("[+] voo levels: upstream ~%.2f dBmV" % (docsisaverage / len(slave.payload['up'])))
            slave.publish()

    except Exception as e:
        print(e)

    slave.sleep(60)
