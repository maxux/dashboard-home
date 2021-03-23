import socket
import redis
import time

r = redis.Redis()
pubsub = r.pubsub()
pubsub.subscribe(['resolver'])

print("[+] waiting for address to resolve")
while True:
    message = pubsub.get_message()
    # print(message)

    if message and message['type'] == 'message':
        address = message['data'].decode('utf-8')

        print("[+] resolving: %s" % address)

        try:
            host = socket.gethostbyaddr(address)
            r.setex("resolver-%s" % address, 30, host[0])
            print("[+] %s -> %s" % (address, host[0]))

        except Exception as e:
            print("[-] could not resolve: %s (%s)" % (address, e))
            r.setex("resolver-%s" % address, 30, "(unknown)")

    time.sleep(0.1)
