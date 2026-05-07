import socket
import json
import redis
import time
from datetime import datetime
from config import dashconfig
from dashboard import DashboardSlave

class APCUPS:
    def __init__(self, host="127.0.0.1", port=3551):
        self.host = host
        self.port = port

        self.sock = None

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

    def parsedict(self, buffer):
        buffer = buffer[1:-2].split(b"\n\x00")

        response = {}
        for line in buffer:
            entry = line[1:].split(b":", 1)
            key = entry[0].decode('utf-8').strip()
            value = entry[1].decode('utf-8').strip()

            response[key] = value

        return response

    def parselist(self, buffer):
        buffer = buffer[1:-2].split(b"\n\x00")

        response = []
        for line in buffer:
            data = line[1:].decode("utf-8").strip()
            response.append(data)

        return response

    def connect(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect((self.host, self.port))

    def readsock(self):
        buffer = b""
        while True:
            buffer += self.sock.recv(1024)
            if buffer.endswith(b"\x00\x00"):
                break

        return buffer

    def status(self):
        if self.sock is None:
            self.connect()

        self.sock.sendall(b'\x00\x06status')
        buffer = self.readsock()

        parsed = self.parsedict(buffer)
        updated = datetime.fromisoformat(parsed['DATE'])

        parsed["EPOCH"] = int(updated.timestamp())

        return parsed

    def events(self):
        if self.sock is None:
            self.connect()

        self.sock.sendall(b'\x00\x06events')
        buffer = self.readsock()

        return self.parselist(buffer)


if __name__ == "__main__":
    apc = APCUPS()
    slave = DashboardSlave("ups")
    slive = DashboardSlave("ups-live")

    remote = redis.Redis(
        unix_socket_path=dashconfig['redis-sock'],
        client_name="ups-listener",
        decode_responses=True
    )

    while True:
        try:
            print("[+] fetching ups status")
            status = apc.status()
            # print(status)

            # events = apc.events()
            # print(events)

            print(f"[+] ups data: {status['DATE']} {status['BATTV']} {status['LINEFREQ']}")


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

            remote.rpush("hombedded-events-backlog", json.dumps(live))

            # slave.sleep(10)

        except Exception as error:
            print(error)
            slave.sleep(5)
