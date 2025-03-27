import socket
import json
import redis
import time
from config import dashconfig
from dashboard import DashboardSlave

class APCUPS:
    def __init__(self, host="127.0.0.1", port=3551):
        self.host = host
        self.port = port

    def event_resolv(self, eventid):
        events = {
            "powerout":   ["Power failure", "danger"],
            "onbattery":  ["Running on UPS batteries", "danger"],
            "failing":    ["Battery power exhausted", "danger"],
            "timeout":    ["Reached run time limit", "danger"],
            "loadlimit":  ["Battery charge below low limit", "danger"],
            "runlimit":   ["Time percentage limit reached", "danger"],
            "doshutdown": ["Shutdown requested", "warning"],
            "mainsback":  ["Power is back", "success"],
            "annoyme":    ["Users requested to logoff", "secondary"],
            "emergency":  ["Battery failure, emergency", "danger"],
            "changeme":   ["UPS battery must be replaced", "warning"],
            "remotedown": ["Remote shutdown requested", "secondary"],
            "commok":     ["Communications with UPS restored", "secondary"],
            "offbattery": ["Mains returned, release batteries", "success"],
            "battdetach": ["Battery disconnected", "warning"],
            "battattach": ["Battery reattached", "success"],
            "endselftest":   ["UPS Self Test completed", "success"],
            "commfailure":   ["Communications with UPS lost", "warning"],
            "startselftest": ["UPS Self Test switch to battery", "info"],
        }

        if eventid in events:
            return events[eventid]

        return [f"Unknown event: {eventid}", "info"]

    def parse(self, buffer):
        buffer = buffer[1:-2].split(b"\n\x00")

        response = {}
        for line in buffer:
            entry = line[1:].split(b":", 1)
            key = entry[0].decode('utf-8').strip()
            value = entry[1].decode('utf-8').strip()

            response[key] = value

        return response

    def status(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((self.host, self.port))
        s.sendall(b'\x00\x06status')

        buffer = b""
        while True:
            buffer += s.recv(1024)
            if buffer.endswith(b"\x00\x00"):
                s.close()
                break

        return self.parse(buffer)


if __name__ == "__main__":
    apc = APCUPS()
    slave = DashboardSlave("ups")
    slive = DashboardSlave("ups-live")

    remote = redis.Redis(
        host=dashconfig['redis-host'],
        port=dashconfig['redis-port'],
        client_name="ups-listener",
        decode_responses=True
    )

    while True:
        try:

            print("[+] fetching ups status")
            status = apc.status()

            print(f"[+] ups updated: {status['DATE']}")

            slave.set(status)
            slave.publish()

            print("[+] checking for ups live event")
            message = remote.blpop("ups-event", timeout=10)
            if message is None:
                continue

            print(f"[+] live event: {message}")

            data = message[1].split(".")
            info = apc.event_resolv(data[0])
            live = {
                "timestamp": int(time.time()),
                "event": data[0],
                "extra": data[1],
                "message": info[0],
                "severity": info[1],
            }

            slive.set(live)
            slive.publish()

            # slave.sleep(10)

        except Exception as error:
            print(error)
            slave.sleep(5)
