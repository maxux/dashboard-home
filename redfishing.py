import redis
import json
import syslog
from config import dashconfig
from dashboard import DashboardSlave

syslog.openlog("redfish")
slave = DashboardSlave("redfishing")

remote = redis.Redis(
    unix_socket_path=dashconfig['redis-sock'],
    client_name="redfishing-listener",
    decode_responses=True
)

pubsub = remote.pubsub()
pubsub.subscribe("redfishing-live")

print("[+] redfishing: waiting for notifications")

while True:
    for message in pubsub.listen():
        if message["type"] != "message":
            continue

        data = json.loads(message["data"])
        formatted = f"[{data['messageid']}] {data['message']}"

        if data['messageid'] not in ['USR0030', 'USR0032'] and data.get("backlog") is None:
            syslog.syslog(formatted)

        print(f"[+] forwarding: {data}")
        slave.set(data)
        slave.publish()
