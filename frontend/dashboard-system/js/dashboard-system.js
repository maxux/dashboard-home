var units  = ['b', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
var rates  = ['b/s', 'KiB/s', 'MiB/s', 'GiB/s', 'TiB/s', 'PiB/s'];
var shortrates  = ['b', 'K', 'M', 'G', 'T', 'P'];
var batpic = ["→", "↓", "↑"];

var color;
var root;

// const redacted_data = "redacted";
// const redacted_enabled = true;

function elapsedstr(elapsed) {
    if(elapsed < 60)
        return elapsed + ' seconds ago';

    elapsed /= 60
    if(elapsed < 60)
        return elapsed.toFixed(0) + ' minutes ago';

    return (elapsed / 60).toFixed(0) + ' hours ago';
}

function elapsedvisibiliy(elapsed) {
    if(elapsed < 3600)
        return 'visibility-recent';

    if(elapsed < (3600 * 3))
        return 'visibility-middle';

    return 'visibility-old';
}

function percentvalue(value, total) {
	if(total == 0)
		return null;

	return parseFloat(Math.floor((value / total) * 100));
}

function colorizesw(value, size) {
	if(value < 10)
		return 'text-muted';

    if(value < 2)
		return 'text-muted';

	if(value < 30)
		return 'text-info';

	return colorize(value);
}

function colorize(value) {
	if(value < 8)
		return 'text-muted';

    if(value < 18)
        return '';

	if(value < 50)
		return 'text-info';

	if(value < 80)
		return 'text-warning';

	return 'text-danger';
}

function raplcolor(value) {
	if(value < 4000)
		return "text-muted";

    if(value < 35000)
        return '';

	if(value < 50000)
		return "text-info";

	if(value < 65000)
		return "text-warning";

	return "text-danger";
}


function loadcolor(value, cpu) {
	if(value < 0.8)
		return 'text-muted';

    if(value < 1.5)
        return '';

	if(value < cpu / 4)
		return 'text-info';

	if(value < cpu)
		return 'text-warning';

	return 'text-danger';
}

function autosize(value) {
	var temp = value / 1024;
	var unitidx = 2;

	if(temp > 1540) {
		temp /= 1024;
		unitidx = 3;
	}

	return temp.toFixed(2) + ' ' + units[unitidx];
}

//
// return a value prefixed by zero if < 10
//
function zerolead(value) {
	return (value < 10) ? '0' + value : value;
}

//
// convert a unix timestamp to readable european date/hours
//
function unixtime(timestamp) {
	var date = new Date(timestamp * 1000);

	var hours = zerolead(date.getHours()) + ':' +
	            zerolead(date.getMinutes()) + ':' +
	            zerolead(date.getSeconds());

	return hours;
}

//
// compute a scaled size with adapted prefix
//
function rate(value) {
	value = value / 1024;
	uindex = 1;

	for(; value > 1024; value /= 1024)
		uindex++;

	return value.toFixed(1) + ' ' + rates[uindex];
}

function shortrate(value) {
	value = value / 1024;
	uindex = 1;

	for(; value > 1024; value /= 1024)
		uindex++;

	return value.toFixed(2) + ' ' + shortrates[uindex];
}

function colorintf(value, maxspeed) {
	var value = value / 1024 / 1024; // let's compute everything in Mbps

	// compute color based on interface speed/capacity
	// if scale is unknown, setting it to 100 Mbps
	if(maxspeed == 0)
		scale = 100;

	// computing percentage of usage
	var pc = (value / maxspeed) * 100;

	if(value < 2)
		return 'text-muted';

    if(value < 5)
        return '';

	if(value < 40)
		return 'text-info';

	if(value < 60)
		return 'text-warning';

	return 'text-danger';
}

function colordisk(value) {
	// using MB/s
	value = value / 1024 / 1024;

	if(value < 1.2)
		return 'text-muted';

    if(value < 10)
        return '';

	if(value < 20)
		return 'text-info';

	if(value < 100)
		return 'text-warning';

	return 'text-danger';
}

function colorbattery(battery) {
    if(battery.load == -1)
        return 'text-muted';

    return '';
}

function colorcputemp(value) {
    // console.log(value);
    if(value < 45)
        return 'text-muted';

    if(value < 55)
        return '';

    if(value < 65)
        return 'text-warning';

    return 'text-danger';
}

function colorhddtemp(text, value) {
    if(value < 35)
        return 'text-muted';

    if(value < 45)
        return '';

    if(value < 50)
        return 'text-warning';

    return 'text-danger';
}

function colorcpu(node) {
    // Handle if one core is at 100%
    for(let pc of node.cpu_usage) {
        if(pc > 95) {
            return "text-danger";
        }
    }

    return colorize(node.cpu_usage[0]);
}

//
// compute an uptime (days or hours supported)
//
function uptime(value) {
	var days = value / 86400;

	if(days >= 2)
		return Math.floor(days) + ' days';

	if(parseInt(days) == 1)
		return Math.floor(days) + ' day';

	return Math.floor(value / 3600) + ' hours';
}

function uptime_color(value) {
	if(value < (3600 * 3))
		return 'text-danger';

	if(value < (86400 * 2))
		return 'text-warning';

	return 'text-success';
}

//
// return a celcius degree if exists
//
function degree(value, limit) {
	if(!value)
		return '-';

	return value + '°C';
}

//
// return formated percent format with different colors
// scaled with value. optional output text can be used
//
function percent(value, extra) {
    if(value == null)
        return "-";

	return value + ' %' + ((extra) ? ' (' + extra + ')' : '');
}

//
// parsing battery rtinfo object
//
function battery(battery) {
	var bat = '';

	if(battery.load == -1)
		return 'AC';

	if(batpic[battery.status] != undefined)
		bat = batpic[battery.status] + ' ';

    var pc = battery.load;
    if(battery.load < 0 || battery.load > 100)
        pc = 100;

	return bat + percent(pc);
}

function host_offline(node, server) {
    return (node.lasttime + 30 < server.servertime);
}

function host_status(node, server) {
    if(host_offline(node, server))
        return "text-danger";

    if(node.lasttime + 5 < server.servertime)
        return "text-warning";

    return "text-success";
}

//
// build a 'summary' table node line
//
function rtinfo_create_element(named) {
    const td = document.createElement("td");
    td.classList.add(named);

    return td;
}

function rtinfo_create_new_node(node) {
    const tr = document.createElement("tr");
    tr.id = `rtinfo-node-${node.hostname}`;

    // Insert in progress node into rtinfo tree
    rtinfo_nodes[node.hostname] = {"tr": tr};

    const items = [
        "nn-host",
        "nn-cpu",
        "nn-cpu-total",
        "nn-ram",
        "nn-swap",
        "nn-load-1",
        "nn-load-5",
        "nn-load-15",
        "nn-remote",
        "nn-time",
        "nn-uptime",
        "nn-battery",
        "nn-cpu-temp",
        "nn-disks-temp",
        "nn-disks-io",
        "nn-net-rx",
        "nn-net-tx"
    ];

    for(var create of items) {
        const element = rtinfo_create_element(create);
        tr.appendChild(element);

        rtinfo_nodes[node.hostname][create] = element;
    }

    return tr;
}

const rtinfo_clearlist = [
    "text-muted",
    "text-light",
    "text-info",
    "text-warning",
    "text-success",
    "text-danger",
];

const rtinfo_nodes = {};
var rtinfo_index = 0;

function rtinfo_summary_node(node, host, server) {
    if(!rtinfo_nodes[node.hostname]) {
        // Create new clean node
        const tr = rtinfo_create_new_node(node);
        document.getElementById(`rtinfo-${host}-nodes`).appendChild(tr);
    }

    // ###############################################

    const rnode = function(x) {
        return rtinfo_nodes[node.hostname][x];
    };

    const rclass = function(x, name) {
        const xnode = rtinfo_nodes[node.hostname][x];
        xnode.classList.remove(...rtinfo_clearlist);
        xnode.classList.add(name ? name : "text-light");
    };

    // ###############################################

    /*
    for(let index in node.loadavg)
        node.loadavg[index] = parseFloat(node.loadavg[index]);
    */

    let cpunr = node.cpu_usage.length - 1;
    let ram   = percentvalue(node.memory.ram_used, node.memory.ram_total);
    let ramsz = autosize(node.memory.ram_used);
    let rapl  = (node.rapl.pkg / 1000).toFixed(1);

    // let swap  = node.memory.swap_total - node.memory.swap_free;
    // let pswap = percentvalue(swap, node.memory.swap_total);
    // let swapz = autosize(swap);

    var disksp = 0;
    for(let idx in node.disks)
        disksp += node.disks[idx].read_speed + node.disks[idx].write_speed;

    var netrxsp = 0
    for(var idx in node.network)
        netrxsp += node.network[idx].rx_rate;

    var nettxsp = 0
    for(var idx in node.network)
        nettxsp += node.network[idx].tx_rate;

    // ###############################################
    rnode("tr").classList.toggle("node-down", host_offline(node, server));

    rnode("nn-host").innerText = node.hostname;
    rclass("nn-host", host_status(node, server));
    // rclass("nn-host", redacted_data);

    rnode("nn-swap").innerText = (rapl > 0) ? `${rapl} watt` : "--";
    rclass("nn-swap", raplcolor(node.rapl.pkg));

    rnode("nn-cpu").innerText = percent(node.cpu_usage[0]);
    rclass("nn-cpu", colorcpu(node));

    rnode("nn-cpu-total").innerText = cpunr;

    rnode("nn-ram").innerText = percent(ram, ramsz);
    rclass("nn-ram", colorize(ram));

    rnode("nn-load-1").innerText = node.loadavg[0].toFixed(2);
    rclass("nn-load-1", loadcolor(node.loadavg[0], cpunr));
    rnode("nn-load-5").innerText = node.loadavg[1].toFixed(2);
    rclass("nn-load-5", loadcolor(node.loadavg[1], cpunr));
    rnode("nn-load-15").innerText = node.loadavg[2].toFixed(2);
    rclass("nn-load-15", loadcolor(node.loadavg[2], cpunr));

    rnode("nn-remote").innerText = node.remoteip;
    // rclass("nn-remote", redacted_data);

    rnode("nn-time").innerText = unixtime(node.time);

    rnode("nn-uptime").innerText = uptime(node.uptime);
    rclass("nn-uptime", uptime_color(node.uptime));

    rnode("nn-battery").innerText = battery(node.battery);

    rnode("nn-cpu-temp").innerText = degree(node.sensors.cpu.average);
    rclass("nn-cpu-temp", colorcputemp(node.sensors.cpu.average));

    rnode("nn-disks-temp").innerText = degree(node.sensors.hdd.average);

    rnode("nn-disks-io").innerText = rate(disksp);
    rclass("nn-disks-io", colordisk(disksp));

    rnode("nn-net-rx").innerText = rate(netrxsp);
    rclass("nn-net-rx", colorintf(netrxsp, 1000));

    rnode("nn-net-tx").innerText = rate(nettxsp);
    rclass("nn-net-tx", colorintf(nettxsp, 1000));
}

//
// build summary table
//
function rtinfo_summary(host, server, nodes) {
    for(var n in nodes) {
        rtinfo_summary_node(nodes[n], host, server);

        if(nodes[n].hostname == "routinx-ng") {
            router_update(nodes[n]);
        }
    }
}

function arraymove(arr, fi, di) {
    var element = arr[fi];
    arr.splice(fi, 1);
    arr.splice(di, 0, element);
}

//
// parsing new json tree and call required display process
//
var __allowed = ["summary"];
var __endpoints = {
    "maxux":  {'name': 'Maxux',  'endpoint': '/rtinfo/maxux'},
}

var __remote = ["maxux"];

function rtinfo_parsing(response, host) {
    // console.log(response);
    const json = response;

	// clearing everyting
	// $('body').addClass('connected');

	//
	// ordering hostname
	//
	var hosts = [];
	var nodes = [];

	for(var x in json.rtinfo)
		hosts.push(json.rtinfo[x].hostname);

	hosts = hosts.sort();

	for(var n in hosts)
		for(var x in json.rtinfo)
			if(json.rtinfo[x].hostname == hosts[n])
				nodes.push(json.rtinfo[x]);

    // console.log(nodes);

	//
	// iterate over differents part showable/hiddable
	//
	rtinfo_summary(host, json, nodes);
}

//
// sorting by ip address
//
function compare_ip_addresses(a, b) {
  const numA = Number(
    a.split('.')
      .map((num, idx) => num * Math.pow(2, (3 - idx) * 8))
      .reduce((a, v) => ((a += v), a), 0)
  );
  const numB = Number(
    b.split('.')
      .map((num, idx) => num * Math.pow(2, (3 - idx) * 8))
      .reduce((a, v) => ((a += v), a), 0)
  );
  return numA - numB;
}

var socket;

function connect() {
    // socket = new WebSocket("wss://" + window.location.hostname + "/websocket/dashboard");
    socket = new WebSocket("ws://10.241.10.254:30501");

    socket.onopen = function() {
        console.log("websocket open");

        const register = {
            "id": "register",
            "name": "dashboard-system",
            "watch": [
                "rtinfo",
                "ping",
                "devices-full",
                "devices",
                "redfishing",
                "switch-status",
                "wireless",
            ],
        };

        socket.send(JSON.stringify(register));
    }

    socket.onmessage = function(msg) {
        const json = JSON.parse(msg.data);
        // console.log(json);

        switch(json["type"]) {
            case "rtinfo":
                rtinfo_parsing(json["payload"], "maxux");
            break;

            case "ping":
                ping_update(json['payload']);
            break;

            case "wireless":
                wireless_update(json['payload']['clients'], json['payload']['update']);
            break;

            case "devices":
            case "devices-full":
                devices_update(json['payload']);
            break;

            case "redfishing":
                redfishing_update(json['payload']);
            break;

            case "switch-status":
                switch_bandwidth(json['payload']);
            break;

            default:
                console.log("Unknown type", json['type']);
                console.log(json);
        }
    }

    socket.onerror = function(event) {
        console.log("websocket error", event);
    }

    socket.onclose = function() {
        setTimeout(connect, 2000);
    }
}

const xKB = 1024;
const xMB = xKB * 1024;
const xGB = xMB * 1024;

const switch_nodes = {};
const switch_classes = [
    "text-bg-danger",
    "text-bg-warning",
    "text-bg-dark",
    "text-muted",
];

function switch_resolve_elements(root, data) {
    switch_nodes[root] = {};

    for(let xsub of ["cpu", "ram", "load"]) {
        switch_nodes[root][xsub] = document.querySelector(`#${root} .${xsub}-root .${xsub}`);
    }

    for(let intf of data["ddm"]) {
        const port = intf["port"].replaceAll('/', '-');
        const key = `ddm-${port}`;
        switch_nodes[root][key] = document.querySelector(`#${root} .lag-root .port-${port}`);
    }
}

function switch_system_color(value) {
    if(value > 65)
        return "text-bg-danger";

    if(value > 45)
        return "text-bg-warning";

    if(value > 24)
        return "text-bg-secondary";

    return "text-bg-dark";
}

function switch_load_color(value) {
    if(value > 25 * xMB)
        return "text-bg-danger";

    if(value > 10 * xMB)
        return "text-bg-warning";

    if(value > 1 * xMB)
        return "text-bg-secondary";

    return "text-bg-dark";
}

function switch_ddm_color(value) {
    if(value > 58)
        return "text-bg-danger";

    if(value > 50)
        return "text-bg-warning";

    if(value > 45)
        return "text-bg-secondary";

    return "text-bg-dark";
}

function switch_update_system(rootid, values) {
    const nodes = switch_nodes[rootid];

    nodes["cpu"].innerText = `${values["system"]["cpu"]} %`;
    nodes["cpu"].classList.remove(...switch_classes);
    nodes["cpu"].classList.add(switch_system_color(values["system"]["cpu"]));

    nodes["ram"].innerText = `${values["system"]["ram"]} %`;
    nodes["ram"].classList.remove(...switch_classes);
    nodes["ram"].classList.add(switch_system_color(values["system"]["ram"]));

    var bandwidth = 0;
    for(let index in values["ports"])
        bandwidth += values["ports"][index]["rx-live"] + values["ports"][index]["tx-live"];

    nodes["load"].innerText = rate(bandwidth);
    nodes["load"].classList.remove(...switch_classes);
    nodes["load"].classList.add(switch_load_color(bandwidth));

    for(let lag of values["ddm"]) {
        const port = lag["port"].replaceAll("/", "-");
        const key = `ddm-${port}`;
        const temperature = lag["temperature"].toFixed(0);

        nodes[key].innerText = `${temperature}°C`;
        nodes[key].classList.remove(...switch_classes);
        nodes[key].classList.add(switch_ddm_color(temperature));
    }
}

function switch_bandwidth(switches) {
    if(!switch_nodes["core-switch-system-cpu"]) {
        switch_resolve_elements("core-switch-system", switches["switch-core"]);
        switch_resolve_elements("room-switch-system", switches["switch-room"]);
    }

    switch_update_system("core-switch-system", switches["switch-core"]);
    switch_update_system("room-switch-system", switches["switch-room"]);
}

const ping_levels = [
    "text-bg-dark",     // first bound
    "text-bg-warning",  // second bound
    "text-bg-danger"    // last resort
];

const ping_bounds = {
    // source: [normal/warning, warning/danger]
    "cbr8-cjl-2-voo-be": [9, 14],
    "public-dns.google.com": [9, 14],
    "kulturax": [7, 10],
    "liza-v4": [25, 33],
    "liza-v6": [25, 33],
    "servix-ng-production": [0.25, 0.7],
    "servix-ng-public": [0.25, 0.7],
    "publix-v4": [14, 28],
    "publix-v6": [12, 26],
};

const ping_elements = {};
const ping_classes = [
    "text-bg-dark",
    "text-bg-warning",
    "text-bg-danger",
    "text-bg-primary"
];

function ping_update(ping) {
    // console.log(ping);
    const name = ping["name"];

    // Caching element resolution
    if(!ping_elements[name]) {
        const xname = name.replace(/\./g, "-");
        const element = document.querySelector(`.ping-${xname} span`);
        if(!element) {
            return null;
        }

        ping_elements[name] = element;
    }

    const element = ping_elements[name];
    element.classList.remove(...ping_classes);

    // Processing ping timeout
    const alive = ping["data"]["value"][0];
    const latency = ping["data"]["value"][1];

    if(!alive) {
        element.classList.add("text-bg-danger");
        element.innerText = "Timeout";
        return false;
    }

    // Compute color level
    const bounds = ping_bounds[name];
    var severity = 0;

    for(var bound of bounds) {
        if(latency < bound) {
            break;
        }

        severity += 1;
    }

    // Compute float precision
    const dividers = [100, 10, 0];
    let cleaned;

    for(var x in dividers) {
        if(latency >= dividers[x]) {
            cleaned = latency.toFixed(x);
            break;
        }
    }

    // Commit updates
    element.innerText = `${cleaned} ms`;
    element.classList.add(ping_levels[severity]);
}

const wireless_classes = [
    "text-danger",
    "text-warning",
    "text-light",
    "text-success",
];

function wireless_signal(value) {
    if(value < -80)
        return "text-danger";

    if(value < -70)
        return "text-warning";

    if(value < -55)
        return "text-light";

    return "text-success";
}

function hrsmin_from_sec(value) {
    var min = ((value / 60) % 60).toFixed(0);
    var hrs = parseInt(value / 3600);

    return [hrs, min];
}

function wireless_online(value) {
    if(value < 120)
        return value + " sec";

    if(value < (60 * 60))
        return (value / 60).toFixed(0) + "m";

    var hm = hrsmin_from_sec(value);

    if(hm[0] < 24)
        return hm[0] + "h " + hm[1] + "m";

    var days = parseInt(hm[0] / 24);
    value -= (days * 86400);

    var hm = hrsmin_from_sec(value);

    return days + "d " + hm[0] + "h "; // + hm[1] + "m";
}

var wireless_last_update = 0;

function wireless_update(clients, timestamp) {
    // console.log(clients);

    // Remove active flag from all Wireless nodes
    for(let id in devices_nodes_id) {
        if(devices_nodes_id[id]["client"].wireless) {
            const client = devices_nodes_id[id];

            client["dd-wireless-signal"].classList.remove("active");
            client["dd-wireless-rate"].classList.remove("active");
            client["dd-wireless-online"].classList.remove("active");
        }
    }

    // Update devices nodes
    for(let id in clients) {
        if(!devices_nodes_id[id]) {
            continue;
        }

        const client = devices_nodes_id[id];
        client["client"].wireless = true;

        const wireless = clients[id];

        const signal = parseFloat(wireless["rssi"]);
        const rate = wireless["rate"];
        const online = wireless["active"];

        client["dd-wireless-signal"].innerText = `${signal} dBm`;
        client["dd-wireless-signal"].classList.toggle("active", true);
        client["dd-wireless-signal"].classList.remove(...devices_rxtx_classes);
        client["dd-wireless-signal"].classList.add(wireless_signal(signal));

        client["dd-wireless-rate"].innerText = `${rate} Mbps`;
        client["dd-wireless-rate"].classList.toggle("active", true);

        client["dd-wireless-online"].innerText = online;
        client["dd-wireless-online"].classList.toggle("active", true);
    }

    wireless_last_update = timestamp;
}

function rxtxclass(value) {
    if(value < 8 * 1024)
        return "text-bg-dark";

    if(value < 112 * 1024)
        return "text-bg-secondary";

    if(value < 1112 * 1024)
        return "text-bg-warning";

    return "text-bg-danger";
}

function rxtxactive(value) {
    return (value > 8 * 1024)
}

const devices_nodes = {};
const devices_nodes_id = {};

const devices_rxtx_classes = [
    "text-bg-dark",
    "text-bg-secondary",
    "text-bg-warning",
    "text-bg-danger",
];

function devices_create_element(named) {
    const div = document.createElement("div");
    div.classList.add(named);

    return div;
}

function devices_create_badge(named) {
    const span = document.createElement("span");
    span.classList.add(named, "badge", "text-bg-dark", "rounded-pill");

    return span;
}

function devices_create_new_node(client) {
    const line = document.createElement("div");
    line.id = `devices-node-${client.id}`;
    line.classList.add("device-node");

    if(client.hostid == 254) {
        line.classList.add("gateway");
    }

    // Save device nodes
    devices_nodes[client.index] = {
        "line": line,
        "client": client,
    };

    // Link devices nodes by id (easy mapping with wireless)
    devices_nodes_id[client.id] = devices_nodes[client.index];

    const items = [
        "dd-mac",
        "dd-ip",
        "dd-host",
        "dd-rx-parent",
        "dd-tx-parent",
        "dd-rx-total-parent",
        "dd-tx-total-parent",
        "dd-wireless",
        "dd-online-parent",
    ];

    for(var create of items) {
        const element = devices_create_element(create);
        line.appendChild(element);

        devices_nodes[client.index][create] = element;

        // Create badge subnodes
        if(create.endsWith("-parent")) {
            const named = create.substr(0, create.length - 7);
            const badge = devices_create_badge(named);
            element.appendChild(badge);

            devices_nodes[client.index][named] = badge;
        }

        // Create Wireless nodes
        if(create == "dd-wireless") {
            for(let target of ["dd-wireless-signal", "dd-wireless-rate", "dd-wireless-online"]) {
                const badge = devices_create_badge(target);
                element.appendChild(badge);

                devices_nodes[client.index][target] = badge;
            }
        }
    }

    devices_nodes[client.index]["dd-mac"].innerText = client.macaddr;
    devices_nodes[client.index]["dd-online"].classList.add("active");

    return line;
}

function devices_client_from_source(index, source, saddresses) {
    const client = {};

    client.index = index;
    client.ipaddr = source["ip-address"];
    client.segments = client.ipaddr.split(".");
    client.order = saddresses.indexOf(source["ip-address"]);
    client.vlan = parseInt(client.segments[2]);
    client.hostid = parseInt(client.segments[3]);

    const hwaddr = source['mac-address'].replaceAll(":", "").replaceAll(".", "");
    client.id = `${hwaddr}-${client.vlan}`;
    client.macaddr = source["mac-address"];

    client.elapsed = 0;
    client.hostname = null;
    client.rx = null;
    client.tx = null;
    client.totalrx = null;
    client.totaltx = null;

    client.wireless = false;

    return client;
}

function devices_client_update(client, source) {
    const now = new Date();

    client.elapsed = (now.getTime() / 1000) - source["timestamp"];
    client.timestamp = source["timestamp"];

    client.hostname = (source["hostname"]) ? source["hostname"] : null;
    if(client.hostname == null && client.hostid == 254) {
        client.hostname = "routinx-ng";
    }

    client.rx = (source["rx"] != undefined) ? source["rx"] : null;
    client.tx = (source["tx"] != undefined) ? source["tx"] : null;
    client.totalrx = source["total-rx"] ? source["total-rx"] : null;
    client.totaltx = source["total-tx"] ? source["total-tx"] : null;

    return client;
}

function devices_update(clients) {
    const now = new Date();

    // ###############################################

    var addresses = [];
    for(let index in clients)
        addresses.push(clients[index]['ip-address']);

    const saddresses = addresses.sort(compare_ip_addresses);

    // ###############################################

    for(let index in clients) {
        const source = clients[index];

        if(source["mac-address"] == "ff:ff:ff:ff:ff:ff")
            continue;

        if(!devices_nodes[index]) {
            const newclient = devices_client_from_source(index, source, saddresses);

            const line = devices_create_new_node(newclient);
            document.getElementById("network-devices").appendChild(line);
        }

        const node = devices_nodes[index];

        // update dynamic values without recreating a complete new client
        const client = devices_client_update(node["client"], source);

        // sorting clients
        node["line"].style.order = client.order;
        node["line"].classList.toggle("offline", (client.elapsed > 1200)); // 20m
        node["line"].classList.toggle("d-none", (client.elapsed > 21600)); // 6h

        // node["dd-mac"].classList.toggle("redacted", redacted_enabled);

        node["dd-ip"].innerText = client.ipaddr;
        // node["dd-ip"].classList.toggle("redacted", redacted_enabled);

        node["dd-host"].innerText = (client.hostname) ? client.hostname : "(unknown)";
        node["dd-host"].classList.toggle("text-muted", !client.hostname);
        // node["dd-host"].classList.toggle("redacted", redacted_enabled);

        node["dd-rx"].innerText = shortrate(client.rx);
        node["dd-rx"].classList.remove(...devices_rxtx_classes);
        node["dd-rx"].classList.add(rxtxclass(client.rx));
        node["dd-rx"].classList.toggle("active", rxtxactive(client.rx));

        node["dd-tx"].innerText = shortrate(client.tx);
        node["dd-tx"].classList.remove(...devices_rxtx_classes);
        node["dd-tx"].classList.add(rxtxclass(client.tx));
        node["dd-tx"].classList.toggle("active", rxtxactive(client.tx));

        node["dd-rx-total"].innerText = (client.totalrx) ? autosize(client.totalrx / 1024) : "--";
        node["dd-tx-total"].innerText = (client.totaltx) ? autosize(client.totaltx / 1024) : "--";

        node["dd-online"].innerText = elapsedstr(client.elapsed.toFixed(0));
        node["dd-online"].dataset.timestamp = client.timestamp;
    }
}

var trafficup = [];
var trafficdown = [];
var trafficitems = 0;
var trafficplotup = null;
var trafficplotdown = null;

const traffic_classes = [
    "text-bg-danger",
    "text-bg-warning",
    "text-bg-secondary",
    "text-bg-dark",
];

const traffic_nodes = {
    "rx": null,
    "tx": null,
};

function router_update(node) {
    // $('.router').empty();
    // console.log(node);

    if(trafficitems == 0) {
        for(var i = 0; i < 60; i++)
            trafficup.push([new Date() - (i * 1000), null]);

        for(var i = 0; i < 60; i++)
            trafficdown.push([new Date() - (i * 1000), null]);

        trafficitems = trafficup.length;

        trafficplotup = $.plot("#chart-upload", [trafficup], {
            series: { color: '#1E90FF' },
            xaxis: { mode: "time", timezone: "browser", ticks: 3, show: false},
            yaxis: { min: 0 },
        });

        trafficplotdown = $.plot("#chart-download", [trafficdown], {
            series: { color: '#F86565' },
            xaxis: { mode: "time", timezone: "browser", ticks: 3, show: false },
            yaxis: { min: 0 },
        });
    }

    // let possible = "text-bg-danger text-bg-warning text-bg-secondary text-bg-dark";

    if(!traffic_nodes["rx"]) {
        traffic_nodes["rx"] = document.querySelector("#router-rate .rr-rx");
        traffic_nodes["tx"] = document.querySelector("#router-rate .rr-tx");
    }

    for(var ifid in node["network"]) {
        var intf = node["network"][ifid];

        if(intf['name'] != 'wan')
            continue;

        traffic_nodes["rx"].innerText = shortrate(intf["rx_rate"]);
        traffic_nodes["rx"].classList.remove(...devices_rxtx_classes);
        traffic_nodes["rx"].classList.add(rxtxclass(intf["rx_rate"]));

        traffic_nodes["tx"].innerText = shortrate(intf["tx_rate"]);
        traffic_nodes["tx"].classList.remove(...devices_rxtx_classes);
        traffic_nodes["tx"].classList.add(rxtxclass(intf["tx_rate"]));

        // update chart
        trafficup = trafficup.slice(1);
        trafficdown = trafficdown.slice(1);

        trafficup.push([new Date(), intf['tx_rate'] / (1024 * 1024)]);
        trafficdown.push([new Date(), intf['rx_rate'] / (1024 * 1024)]);

        trafficplotup.setData([trafficup]);
        trafficplotup.setupGrid();
        trafficplotup.draw();

        trafficplotdown.setData([trafficdown]);
        trafficplotdown.setupGrid();
        trafficplotdown.draw();
    }
}



var redlog = [];
const redmax = 6;
const redsev = {
    "Informational": "text-bg-success",
    "Warning": "text-bg-warning",
    "Critical": "text-bg-danger",
};
const redinfoid = {
    "SYS1003": "text-bg-secondary",
    "SYS1001": "text-bg-info",
    "SYS1000": "text-bg-info",
};


function redfishing_update(payload) {
    redlog.push(payload);
    if(redlog.length > redmax)
        redlog.shift();

    $(".redfishing").empty();

    for(var i in redlog) {
        let entry = redlog[i];

        let datestr = moment.unix(entry['timestamp']).format("DD MMM HH:mm:ss");
        let dateb = $("<span>", {"class": "badge text-bg-dark me-2"}).html(datestr);
        let sourceb = $("<span>", {"class": "badge text-bg-dark me-2"}).html(entry["host"]);

        var severity = redsev[entry['severity']];
        if(entry['messageid'] in redinfoid)
            severity = redinfoid[entry['messageid']];

        let messageb = $("<span>", {"class": "badge message " + severity}).html(entry['message']);

        $(".redfishing").prepend($("<div>").append(dateb).append(sourceb).append(messageb));
    }

    // document.querySelector(".redfishing").classList.toggle("redacted", redacted_enabled);
}

function cronjob() {
    const now = new Date();

    const online = document.querySelectorAll(".dd-online");
    online.forEach((timed) => {
        const elapsed = (now.getTime() / 1000) - parseInt(timed.dataset.timestamp);
        timed.innerText = elapsedstr(elapsed.toFixed(0));
    });
}

$(document).ready(function() {
    connect();
    setInterval(cronjob, 1000); // 1s
});
