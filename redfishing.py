import redis
import json
import syslog
from config import dashconfig
from dashboard import DashboardSlave

syslog.openlog("redfish")

slave = DashboardSlave("redfishing")

remote = redis.Redis(
    host=dashconfig['redis-host'],
    port=dashconfig['redis-port'],
    client_name="redfishing-listener",
    decode_responses=True
)

pubsub = remote.pubsub()
pubsub.subscribe("redfishing-live")

print("[+] redfishing: waiting for notifications")

while True:
    # try:
    message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1)
    if message is None:
        continue

    payload = json.loads(message['data'])

    p = payload
    formatted = f"{p['source']}: [{p['messageid']}] {p['message']}"

    syslog.syslog(formatted)

    print(f"[+] forwarding: {payload}")
    slave.set(payload)
    slave.publish()

     # except Exception as e:
     #    print(e)
