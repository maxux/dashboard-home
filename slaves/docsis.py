from modules.voolevels import *
from config import dashconfig
from dashboard import DashboardSlave

slave = DashboardSlave("docsis-levels")

while True:
    print("[+] voo levels: fetching new values")

    levels = SignalLevel(dashconfig['voo-address'], dashconfig['voo-password'])

    try:
        response = levels.fetch()
        if response:
            slave.set({'up': levels.upstream, 'down': levels.downstream})

            docsisaverage = 0.0
            for ups in slave.payload['up']:
                docsisaverage += ups['txpower']

            print("[+] voo levels: upstream ~%.2f dBmV" % (docsisaverage / len(slave.payload['up'])))
            slave.publish()

    except Exception as e:
        print(e)

    slave.sleep(10)
