# Dashboard Home Server
Home dashboard central server

**WARNING**: this repository contains code you can reuse but this project won't works out-of-box for you.
I doubt you use the exact same setup as me, since it use lot of custom hardware, monitoring, sensors and custom stuff.

Feel free to take piece of code from this work, it's here for you (and to backup my code).

# Screenshots
![Screenshot 1](https://i.imgur.com/ztvFgGj.png)
![Screenshot 2](https://i.imgur.com/jJdmmI2.png)

# Installation
- Copy `config-sample.py` to `config.py`
- Edit `config.py` with custom parameters
- Create an empty database: `cat db/schema.sql | sqlite3 db/sensors.sqlite3`
- Start the dashboard server: `python3 dashboard.py`

# Workflow
Basicly, this dashboard server listen to two things:
- One (private) http server, used to update database (push data)
- One (more public) websocket server, used to send current status and update to clients

A simple web-page connecting websocket and parsing json input can display information easily and in realtime.

Each part of the dashboard (ping, rtinfo, power, ...) runs inside future and does everything in async.

There is a redis server use in the middle to handle dhcp hosts (can be found on `tools` directory)
