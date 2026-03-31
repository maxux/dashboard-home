# import requests
import socket
import json
from config import dashconfig
from dashboard import DashboardSlave

slave = DashboardSlave("rtinfo")

while True:
    print("[+] rtinfo: fetching")

    try:
        """
        response = requests.get(dashconfig['rtinfo-endpoint'], timeout=2)
        slave.set(response.json())
        """

        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.connect((dashconfig['rtinfo-host'], dashconfig['rtinfo-port']))

            while True:
                s.sendall(f"GET {dashconfig['rtinfo-uri']} X\n".encode("utf-8"))
                header = True
                buffer = b""

                while header:
                    buffer += s.recv(128)
                    if b"\r\n\r\n" in buffer:
                        header = False

                headers = buffer.decode("utf-8").split("\r\n")
                expected = 0

                for x in headers:
                    if x.lower().startswith("content-length: "):
                        expected = int(x[16:])

                leftover = headers[-1].encode("utf-8")
                expected -= len(leftover)

                payload = leftover + s.recv(expected)
                slave.set(json.loads(payload))

                hosts = len(slave.payload['rtinfo'])
                size = len(payload)

                print(f"[+] rtinfo: {hosts} hosts found, {size} bytes")
                slave.publish()
                slave.sleep(1)

    except Exception as e:
        print(e)

    slave.sleep(1)
