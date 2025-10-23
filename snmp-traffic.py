import asyncio
import copy
import time
from pysnmp.hlapi.v3arch.asyncio import *
from pysnmp.smi.rfc1902 import ObjectIdentity, ObjectType
from config import dashconfig
from dashboard import DashboardSlave

class InterfaceMonitoringSNMP:
    def __init__(self, host, community):
        self.host = host
        self.community = community
        self.transport = None

        self.intfnames = {}
        self.intflist = []
        self.rxcurrent = {}
        self.rxcurrentmb = {}
        self.txcurrent = {}
        self.txcurrentmb = {}

    async def request(self, prefix, maxrep=None):
        response = []
        n = 0 if maxrep is not None else 1
        r = maxrep or 0

        if self.transport is None:
            self.transport = await UdpTransportTarget.create((self.host, 161))

        args = [
            SnmpEngine(),
            CommunityData(self.community),
            self.transport,
            ContextData(),
            n,
            r
        ]

        for pfx in prefix:
            args.append(ObjectType(ObjectIdentity(pfx)))

        g = await bulk_cmd(*args, lookupMib=False)

        errorIndication = g[0]
        errorStatus = g[1]
        errorIndex = g[2]
        varBindTable = g[3]

        if errorIndication:
            raise RuntimeError(errorIndication)

        if errorStatus:
            raise RuntimeError(errorStatus)

        # print(errorIndication, errorStatus, errorIndex)

        for x in varBindTable:
            key = str(x[0])
            response.append([key, str(x[1])])

        return response

    async def cpu_usage(self):
        data = await self.request([".1.3.6.1.4.1.11863.6.4.1.1.1.1.2"], 3)
        usage = {
            "5s": int(data[0][1]),
            "1m": int(data[1][1]),
            "5m": int(data[2][1]),
        }

        return usage

    async def memory_usage(self):
        data = await self.request([".1.3.6.1.4.1.11863.6.4.1.2.1.1.2"], 1)
        return {"mem": int(data[0][1])}

    async def uptime(self):
        data = await self.request([".1.3.6.1.2.1.1.3"])
        return {"uptime": int(data[0][1]) / 1000}

    async def names(self):
        data = await self.request([".1.3.6.1.2.1.31.1.1.1.1.1"], 30)
        for response in data:
            intfid = response[0].split(".")[-1]
            self.intfnames[intfid] = response[1]
            self.intflist.append(intfid)

        return self.intfnames

    """
    async def rxbytes(self):
        data = await self.request([".1.3.6.1.2.1.31.1.1.1.6"], 30)
        for response in data:
            intfid = response[0].split(".")[-1]
            self.rxcurrent[intfid] = int(response[1])
            self.rxcurrentmb[intfid] = int(response[1]) / (1024 * 1024)

        return self.rxcurrent

    async def txbytes(self):
        data = await self.request([".1.3.6.1.2.1.31.1.1.1.10"], 30)
        for response in data:
            intfid = response[0].split(".")[-1]
            self.txcurrent[intfid] = int(response[1])
            self.txcurrentmb[intfid] = int(response[1]) / (1024 * 1024)

        return self.txcurrent
    """

    # request rx and tx in a single request
    async def rxtxbytes(self):
        data = await self.request([".1.3.6.1.2.1.31.1.1.1.6", ".1.3.6.1.2.1.31.1.1.1.10"], 30)
        for response in data:
            segid = response[0].split(".")
            intfid = segid[-1]
            direction = segid[-2]

            if direction == "6":
                self.rxcurrent[intfid] = int(response[1])
                self.rxcurrentmb[intfid] = int(response[1]) / (1024 * 1024)

            elif direction == "10":
                self.txcurrent[intfid] = int(response[1])
                self.txcurrentmb[intfid] = int(response[1]) / (1024 * 1024)

        return [self.rxcurrent, self.rxcurrentmb, self.txcurrent, self.txcurrentmb]

async def update_bandwidth(core, room, slave):
    print("fetching...")

    core_rxtxnow = await core.rxtxbytes()
    room_rxtxnow = await room.rxtxbytes()
    n = core.intfnames

    for nm in core.intflist:
        core_rxmb = core_rxtxnow[1][nm]
        core_txmb = core_rxtxnow[3][nm]
        core_rkbps = ((core_rxtxnow[0][nm] - core.lastsnap[0][nm]) / 1024) / 10
        core_tkbps = ((core_rxtxnow[2][nm] - core.lastsnap[2][nm]) / 1024) / 10

        room_rxmb = room_rxtxnow[1][nm]
        room_txmb = room_rxtxnow[3][nm]
        room_rkbps = ((room_rxtxnow[0][nm] - room.lastsnap[0][nm]) / 1024) / 10
        room_tkbps = ((room_rxtxnow[2][nm] - room.lastsnap[2][nm]) / 1024) / 10

        print(f"{n[nm]: <24} = RX {core_rxmb:7.1f} MB    TX {core_txmb:7.1f} MB -- R {core_rkbps:3.0f} KB/s   T {core_tkbps:3.0f} KB/s")
        print(f"{n[nm]: <24} = RX {room_rxmb:7.1f} MB    TX {room_txmb:7.1f} MB -- R {room_rkbps:3.0f} KB/s   T {room_tkbps:3.0f} KB/s")

    packed = {
        "interfaces": core.intflist,
        "rxtxnow": {
            "core": {
                "rx": core_rxtxnow[0],
                "tx": core_rxtxnow[2],
            },
            "room": {
                "rx": room_rxtxnow[0],
                "tx": room_rxtxnow[2],
            },
        },
        "lastsnap": {
            "core": {
                "rx": core.lastsnap[0],
                "tx": core.lastsnap[2],
            },
            "room": {
                "rx": room.lastsnap[0],
                "tx": room.lastsnap[2],
            },
        }
    }

    slave.set(packed)
    slave.publish()

    core.lastsnap = copy.deepcopy(core_rxtxnow)
    room.lastsnap = copy.deepcopy(room_rxtxnow)

    return True

async def initial_update(core, room):
    n = await core.names()
    print(n)

    c = await core.cpu_usage()
    print(c)

    m = await core.memory_usage()
    print(m)

    u = await core.uptime()
    print(u)

    core_rxtxnow = await core.rxtxbytes()
    room_rxtxnow = await room.rxtxbytes()

    core.lastsnap = copy.deepcopy(core_rxtxnow)
    room.lastsnap = copy.deepcopy(room_rxtxnow)

    return True

def debug(core, room):
    slave = DashboardSlave("switch-bandwidth")

    print("initial snmp request")
    asyncio.run(initial_update(core, room))

    print("waiting next update")
    time.sleep(10)

    while True:
        asyncio.run(update_bandwidth(core, room, slave))

        print("waiting next aggregation")
        time.sleep(10)

if __name__ == "__main__":
    core = InterfaceMonitoringSNMP("10.241.100.100", "public")
    room = InterfaceMonitoringSNMP("10.241.100.110", "public")
    debug(core, room)

