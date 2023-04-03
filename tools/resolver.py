import socket
import redis
import time
from ipwhois import IPWhois

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

        found = False

        try:
            host = socket.gethostbyaddr(address)
            r.setex("resolver-%s" % address, 30, host[0])
            print("[+] %s -> %s" % (address, host[0]))
            found = True

        except Exception as e:
            print("[-] could not resolve: %s (%s)" % (address, e))
            found = False

        if not found:
            try:
                resolv = IPWhois(address)
                w = resolv.lookup_whois()
                description = w['nets'][0]['description']

                print("[+] %s -> %s" % (address, description))
                r.setex("resolver-%s" % address, 30, description)

            except Exception as e:
                print(e)

    time.sleep(0.1)
