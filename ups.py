import socket
import json
from dashboard import DashboardSlave

class APCUPS:
    def __init__(self, host="127.0.0.1", port=3551):
        self.host = host
        self.port = port

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

    while True:
        print("[+] fetching ups status")
        status = apc.status()

        print(f"[+] ups updated: {status['DATE']}")

        slave.set(status)
        slave.publish()
        slave.sleep(60)
