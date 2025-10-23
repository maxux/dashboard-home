import redis
import time
import json

r = redis.Redis()
k = r.keys("traffic-live-*")
now = int(time.time())

for a in k:
    x = r.get(a)
    info = json.loads(x.decode('utf-8'))

    if info['active'] + 1000 > now:
        print("%s / %.2f GB / %.2f GB" % (info['host'], info['total-rx'] / (1024 * 1024 * 1024.0), info['total-tx'] / (1024 * 1024 * 1024.0)))
