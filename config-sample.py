dashconfig = {
    # database location
    'db-path': 'db/sensors.sqlite3',

    # list of sensors identifier
    'sensors-id': [
        "28-031644fec5ff",
    ],

    # list of host to ping
    'ping-targets': {
        "public-dns.google.com":
            {"target": "8.8.8.8", "value": (False, 0)},
    },

    # wireless interface to monitor
    'wireless-intf': ["wlan0", "wlan1"],

    # private weather url
    'weather-station': '',
    'weather-rain': '',

    # rtinfo json source
    'rtinfo-endpoint': 'http://rtinfo-host/json',

    # muxberrypi server for gpio status
    'muxberrypi-endpoint': 'http://muxberry-host',

    # voo modem address and password
    'voo-address': '192.168.100.1',
    'voo-password': '',

    # private (update) endpoint listener
    'http-listen-addr': "10.241.0.254",
    'http-listen-port': 30502,

    # public (dashboard webpage) websocket listener
    'ws-listen-addr': "0.0.0.0",
    'ws-listen-port': 30501,
}
