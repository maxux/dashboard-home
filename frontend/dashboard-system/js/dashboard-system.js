var units  = ['b', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
var rates  = ['b/s', 'KiB/s', 'MiB/s', 'GiB/s', 'TiB/s', 'PiB/s'];
var shortrates  = ['b', 'K', 'M', 'G', 'T', 'P'];
var batpic = ["→", "↓", "↑"];

var color;
var root;

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

function colorcputemp(text, value) {
    if(value == 0)
        return 'text-muted';

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

function host_status(node, server) {
    if(node.lasttime + 30 < server.servertime)
        return "text-danger";

    if(node.lasttime + 5 < server.servertime)
        return "text-warning";

    return "text-success";
}

//
// build a 'summary' table node line
//
function summary_node(node, host, server) {
    let prefix = "rtinfo-" + host + "-" + node.hostname;

    if($("#" + prefix).length == 0) {
        let tr = $("<tr>", {"id": prefix});

        tr.append($('<td>', {'class': 'nn-host'}).html(node.hostname));
        tr.append($('<td>', {'class': 'nn-cpu'}));
        tr.append($('<td>', {'class': 'nn-cpu-total'}));
        tr.append($('<td>', {'class': 'nn-ram'}));
        tr.append($('<td>', {'class': 'nn-swap'}));
        tr.append($('<td>', {'class': 'nn-load-1'}));
        tr.append($('<td>', {'class': 'nn-load-5'}));
        tr.append($('<td>', {'class': 'nn-load-15'}));
        tr.append($('<td>', {'class': 'nn-remote'}));
        tr.append($('<td>', {'class': 'nn-time'}));
        tr.append($('<td>', {'class': 'nn-uptime'}));
        tr.append($('<td>', {'class': 'nn-battery'}));
        tr.append($('<td>', {'class': 'nn-cpu-temp'}));
        tr.append($('<td>', {'class': 'nn-disks-temp'}));
        tr.append($('<td>', {'class': 'nn-disks-io'}));
        tr.append($('<td>', {'class': 'nn-net-rx'}));
        tr.append($('<td>', {'class': 'nn-net-tx'}));

        $("#rtinfo-" + host + "-nodes").append(tr);
    }

    $("#" + prefix).removeClass("node-down");

    // strip down all style in one shot
    $("#" + prefix + " td").removeClass(classes_states);

    if(node.lasttime + 30 < server.servertime)
        $("#" + prefix).addClass("node-down");

    $("#" + prefix + " .nn-host").addClass(host_status(node, server));

    for(let index in node.loadavg)
        node.loadavg[index] = parseFloat(node.loadavg[index]).toFixed(2);

    let cpunr = node.cpu_usage.length - 1;
    let ram   = percentvalue(node.memory.ram_used, node.memory.ram_total);
    let ramsz = autosize(node.memory.ram_used);

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


    $("#" + prefix + " .nn-cpu").html(percent(node.cpu_usage[0])).addClass(colorize(node.cpu_usage[0]));
    $("#" + prefix + " .nn-cpu-total").html(cpunr);
    $("#" + prefix + " .nn-ram").html(percent(ram, ramsz)).addClass(colorize(ram));
    // $("#" + prefix + " .nn-swap").html(percent(pswap, swapz)).addClass(colorize(pswap));

    /*
    if(node.hostname in summary_main_power) {
        let server = summary_main_power[node.hostname];
        var color = "text-light";

        if(server.power > 170)
            color = "text-warning";

        if(server.power > 260)
            color = "text-danger";

        $("#" + prefix + " .nn-swap").html(server.power + " watt").addClass(color);

    } else {
        $("#" + prefix + " .nn-swap").html("-").addClass("text-muted");
    }
    */

    $("#" + prefix + " .nn-swap").html("-").addClass("text-muted");

    $("#" + prefix + " .nn-load-1").html(node.loadavg[0]).addClass(loadcolor(node.loadavg[0]));
    $("#" + prefix + " .nn-load-5").html(node.loadavg[1]).addClass(loadcolor(node.loadavg[1]));
    $("#" + prefix + " .nn-load-15").html(node.loadavg[2]).addClass(loadcolor(node.loadavg[2]));
    $("#" + prefix + " .nn-remote").html(node.remoteip);
    $("#" + prefix + " .nn-time").html(unixtime(node.time));
    $("#" + prefix + " .nn-uptime").html(uptime(node.uptime)).addClass(uptime_color(node.uptime));
    $("#" + prefix + " .nn-battery").html(battery(node.battery));
    $("#" + prefix + " .nn-cpu-temp").html(degree(node.sensors.cpu.average));
    $("#" + prefix + " .nn-disks-temp").html(degree(node.sensors.hdd.average));
    $("#" + prefix + " .nn-disks-io").html(rate(disksp)).addClass(colordisk(disksp));
    $("#" + prefix + " .nn-net-rx").html(rate(netrxsp)).addClass(colorintf(netrxsp, 1000));
    $("#" + prefix + " .nn-net-tx").html(rate(nettxsp)).addClass(colorintf(nettxsp, 1000));

    /*
    tr.append($('<td>', colorize(node.cpu_usage[0]))
        .html($('<span>', {'class': 'wfix'}).html(percent(node.cpu_usage[0]))));

    tr.append($('<td>').html(cpunr));

    var size = autosize(node.memory.ram_used);
    tr.append($('<td>', colorize(ram)).html(percent(ram, size)));

    var size = autosize(swap);
    if(node.memory.swap_total > 0)
        tr.append($('<td>', colorizesw(pswap, swap)).html(percent(pswap, size)));

    else tr.append($('<td>').html('-'));

    tr.append($('<td>', loadcolor(node.loadavg[0], cpunr)).html(node.loadavg[0]));
    tr.append($('<td>', loadcolor(node.loadavg[1], cpunr)).html(node.loadavg[1]));
    tr.append($('<td>', loadcolor(node.loadavg[2], cpunr)).html(node.loadavg[2]));
    tr.append($('<td>').html(node.remoteip));
    tr.append($('<td>').html(unixtime(node.time)));

    var up = uptime(node.uptime);
    tr.append($('<td>', uptime_color(node.uptime)).html(up));

    var bat = battery(node.battery);
    tr.append($('<td>', colorbattery(node.battery)).html(bat));

    tr.append($('<td>').html(colorcputemp(degree(node.sensors.cpu.average), node.sensors.cpu.average)));
    tr.append($('<td>').html(colorhddtemp(degree(node.sensors.hdd.average), node.sensors.hdd.average)));

    // disk usage
    var speed = 0
    for(var idx in node.disks)
        speed += node.disks[idx].read_speed + node.disks[idx].write_speed;

    tr.append($('<td>', colordisk(speed)).html(rate(speed)));

    // network usage (rx)
    var speed = 0
    for(var idx in node.network)
        speed += node.network[idx].rx_rate;

    tr.append($('<td>', colorintf(speed, 1000)).html(rate(speed)));

    // network usage (tx)
    var speed = 0
    for(var idx in node.network)
        speed += node.network[idx].tx_rate;

    tr.append($('<td>', colorintf(speed, 1000)).html(rate(speed)));

    return tr;
    */
}


//
// build summary table
//
function summary(host, server, nodes) {
    for(var n in nodes) {
        summary_node(nodes[n], host, server);

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

function parsing(response, host) {
    // console.log(response);
    var json = response;

	// clearing everyting
	$('body').addClass('connected');

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
	summary(host, json, nodes);
}

function parsing_local(response, host) {
    // console.log(response);
    var json = response;

    //
    // router information
    //
	for(var x in json.rtinfo)
        if(json.rtinfo[x].hostname == "routinx")
            router_update(json.rtinfo[x]);
}


function call(host) {
    // ensure this source exists
    if($('#root-' + host).length == 0) {
        let root = $('<div>', {'id': 'root-' + host});
        let table = $('<table>', {'class': "table table-hover table-borderless table-sm table-dark m-0", "id": "summary-" + host});

        var thead = $('<thead>')
            .append($('<td>', {'class': 'td-8'}).html('Hostname'))
            .append($('<td>', {'class': 'td-3'}).html('CPU'))
            .append($('<td>', {'class': 'td-2'}).html('#'))
            .append($('<td>', {'class': 'td-10'}).html('RAM'))
            .append($('<td>', {'class': 'td-10'}).html('Power'))
            .append($('<td>', {'colspan': 3, 'class': 'td-10'}).html('Load Average'))
            .append($('<td>', {'class': 'td-8'}).html('Remote IP'))
            .append($('<td>', {'class': 'td-5'}).html('Time'))
            .append($('<td>', {'class': 'td-5'}).html('Uptime'))
            .append($('<td>', {'class': 'td-3'}).html('Pwr'))
            .append($('<td>', {'class': 'td-4'}).html('CPU'))
            .append($('<td>', {'class': 'td-4'}).html('Disk'))
            .append($('<td>', {'class': 'td-8'}).html('Disks I/O'))
            .append($('<td>', {'class': 'td-8'}).html('Net RX'))
            .append($('<td>', {'class': 'td-8'}).html('Net TX'));

        table.append(thead);
        table.append($('<tbody>', {"id": "rtinfo-" + host + "-nodes"}));
        root.append(table);

        $('#content').append(root);
    }
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
    socket = new WebSocket("wss://" + window.location.hostname + "/websocket/dashboard");

    socket.onopen = function() {
        console.log("websocket open");
        $('#disconnected').hide();
    }

    socket.onmessage = function(msg) {
        json = JSON.parse(msg.data);
        // console.log(json);

        switch(json['type']) {
            case "weather":
            case "sensors":
            case "sensors-backlog":
            case "power":
            case "power-backlog":
            case "power-backlog-days":
            case "gpio-status":
            case "sensors-dht":
            case "ups":
                // ignore all of this
                // console.log("ignoring", json['type']);
            break;

            case "rtinfo":
                // console.log("processing", json['type']);
                call("maxux");
                parsing(json['payload'], 'maxux');
            break;

            /*
            case "rtinfo-local":
                // console.log("processing", json['type']);
                parsing_local(json['payload'], 'maxux');
            break;
            */

            case "ping":
                // console.log("processing", json['type']);
                ping_update(json['payload']);
            break;

            case "wireless":
                // console.log("processing", json['type']);
                wireless_update(json['payload']['clients'], json['payload']['update']);
            break;

            case "devices":
                // console.log("processing", json['type']);
                devices_update(json['payload']);
            break;

            case "docsis-levels":
                // console.log("processing", json['type']);
                // docsis(json['payload']);
            break;

            case "dnsquery":
                // console.log("processing", json['type']);
                dns_activity(json['payload']);
            break;

            case "redfishing":
                // console.log("processing", json['type']);
                redfishing_update(json['payload']);
            break;

            case "redfish-power":
                // console.log("processing", json['type']);
                redfish_power_update(json['payload']);
            break;

            case "switch-status":
                switch_bandwidth(json['payload']);
            break;

            case "ups-live":
                // console.log("processing", json['type']);
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
        $('#disconnected').show();
        setTimeout(connect, 2000);
    }
}

const xKB = 1024;
const xMB = xKB * 1024;
const xGB = xMB * 1024;

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
    const possible = "text-bg-danger text-bg-warning text-bg-dark text-muted";

    $("#" + rootid + " .cpu")
        .removeClass(possible).addClass(switch_system_color(values['system']['cpu']))
        .html(values['system']['cpu'] + " %");

    $("#" + rootid + " .ram")
        .removeClass(possible).addClass(switch_system_color(values['system']['ram']))
        .html(values['system']['ram'] + " %");

    var bandwidth = 0;
    for(var i in values['ports'])
        bandwidth += values['ports'][i]['rx-live'] + values['ports'][i]['tx-live'];

    $("#" + rootid + " .net")
        .removeClass(possible).addClass(switch_load_color(bandwidth))
        .html(rate(bandwidth));

    for(var i in values['ddm']) {
        let ddm = values['ddm'][i];
        let nodeid = "#" + rootid + " .ddm.port-" + ddm['port'].replaceAll('/', '-');
        let temperature = ddm['temperature'].toFixed(0);

        $(nodeid)
            .removeClass(possible).addClass(switch_ddm_color(temperature))
            .html(temperature + "°C");
    }
}

function switch_bandwidth(switches) {
    switch_update_system("core-switch-system", switches['switch-core']);
    switch_update_system("room-switch-system", switches['switch-room']);
}

function ping_update(ping) {
    // console.log(ping);

    // replace dot by dash
    var clname = ping['name'].replace(/\./g, "-");

    if(ping['data']['value'][0] == false) {
        var badge = {'class': 'badge text-danger'};
        $('.ping-' + clname).addClass('system-error').html($('<span>').html('Timeout'));
        return;
    }

    // parse latency
    var latency = parseFloat(ping['data']['value'][1]);
    var badge = {'class': 'badge text-bg-success'};

    if(latency < 40) {
        badge = {'class': 'badge text-bg-dark'};

    } else if(latency < 80) {
        badge = {'class': 'badge text-bg-warning'};

    } else {
        badge = {'class': 'badge text-bg-danger'};
    }

    var latval = 0;

    if(latency >= 100) {
        latval = latency.toFixed(0);

    } else if(latency >= 10) {
        latval = latency.toFixed(1);

    } else {
        latval = latency.toFixed(2);
    }

    // var tr = $('<tr>');
    // tr.append($('<td>').html($('<small>').html(ping['name'])));
    // tr.append($('<td>').html($('<span>', {'class': 'glyphicon ' + status})));
    // tr.append($('<td>').html($('<span>', badge).html(latency.toFixed(2) + ' ms')));
    $('.ping-' + clname).removeClass('system-error');
    $('.ping-' + clname).html($('<span>', badge).html(latval + ' ms'));
}

function wireless_signal(value) {
    if(value < -80)
        return 'ww-signal text-danger';

    if(value < -70)
        return 'ww-signal text-warning';

    if(value < -55)
        return 'ww-signal';

    return 'ww-signal text-success';
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
var wireless_clients = {};

const wireless_short_ssid = {
    "Maxux Network (2.4G)": "2G",
    "Maxux Network (5.2G)": "5G",
    "Maxux Legacy": "LE",
    "Maxux Legacy (5.2G - Trusted)": "5T",
    "Maxux Legacy (2.4G - Trusted)": "2T",
};

const classes_states = 'text-success text-warning text-danger text-info text-muted ' +
    'bg-success bg-warning bg-info bg-danger ' +
    'text-bg-success text-bg-warning text-bg-info text-bg-danger text-bg-secondary text-bg-dark ' +
    'active inactive';

function wireless_update(clients, timestamp) {
    // console.log(clients);

    // flushing wireless clients
    wireless_clients = clients;

    /*
    for(let id in clients) {
        let client = clients[id];
        let keyid = client['address'].toLowerCase();

        // update global table
        wireless_clients[keyid] = client;
    }
    */

    wireless_last_update = timestamp;
}

/*
function wireless_update(clients, timestamp) {
    // console.log(clients);
    wireless_clients = {}

    let sigspan = '<span class="glyphicon glyphicon-small glyphicon-signal"></span> ';

    // first flag all existing clients as maybe outdated
    $(".wireless tr").addClass("discard");

    for(let id in clients) {
        let client = clients[id];
        let keyid = client['address'].toLowerCase();
        let bssid = client['address'].replaceAll(":", "");

        // update global table
        wireless_clients[keyid] = client;

        // no more wireless table to show
        continue;

        let online = wireless_online(client['online']);
        let signal = parseFloat(client['rssi']);
        let sigclass = wireless_signal(signal);

        // FIXME: remove old clients

        if($("#wireless-node-" + bssid).length == 0) {
            let tr = $("<tr>", {"id": "wireless-node-" + bssid});

            tr.append($('<td>', {'class': 'ww-ssid'}).html(wireless_short_ssid[client['ssid']]));
            tr.append($('<td>', {'class': 'ww-address'}).html(client['address']));
            tr.append($('<td>', {'class': 'ww-rate'}));
            tr.append($('<td>', {'class': 'ww-signal'}));
            tr.append($('<td>', {'class': 'ww-online badge text-bg-dark rounded-pill'}));

            $('.wireless').append(tr);
        }

        // this client is still alive
        $("#wireless-node-" + bssid).removeClass("discard");

        $("#wireless-node-" + bssid + " .ww-ssid").html(wireless_short_ssid[client['ssid']]);
        $("#wireless-node-" + bssid + " .ww-address").html(client['address']);
        $("#wireless-node-" + bssid + " .ww-rate").html(client['linkrate'] + ' Mbps');
        $("#wireless-node-" + bssid + " .ww-online").html(online);
        $("#wireless-node-" + bssid + " .ww-signal").html(sigspan + signal + ' dBm').removeClass(classes_states).addClass(sigclass);


        // tr.append($('<td>').html(freqs[client['ssid']]));
        // tr.append($('<td>').html(client['address']));
        // // tr.append($('<td>').html(client['ip']));
        // tr.append($('<td>').html('Rate: ' + client['linkrate'] + ' Mbps'));
        // tr.append($('<td>', wireless_signal(signal)).html(sigspan + signal + ' dBm'));
        // tr.append($('<td>').html('Online: ' + online));

        // $('.wireless').append(tr);
    }

    // commit last update
    wireless_last_update = timestamp;
}
*/

function rxtxclass(value) {
    var active = (value < 8 * 1024) ? ' inactive' : ' active';

    if(value < 8 * 1024)
        return 'text-bg-dark' + active;

    if(value < 112 * 1024)
        return 'text-bg-secondary' + active;

    if(value < 1112 * 1024)
        return 'text-bg-warning' + active;

    return 'text-bg-danger' + active;
}

function rxtxactive(value) {
    if(value < 8 * 1024)
        return 'inactive';

    return 'active';
}

function devices_update(clients) {
    var now = new Date();

    let downarrow = '<span class="glyphicon glyphicon-small glyphicon-arrow-down"></span> ';
    let uparrow = '<span class="glyphicon glyphicon-small glyphicon-arrow-up"></span> ';
    let sigicon = '<span class="glyphicon glyphicon-small glyphicon-signal"></span> ';

    $(".devices .device-node").addClass("discard");

    // first pass to sort ip addresses
    var devices_addresses = [];
    for(let index in clients)
        devices_addresses.push(clients[index]['ip-address']);

    const addresses_sorted = devices_addresses.sort(compare_ip_addresses);

    for(let index in clients) {
        // ip address as key, this is malformed, ignoring
        /*
        if(index.indexOf('.') > -1)
            continue;
        */

        const client = clients[index];

        let hostseg = client['ip-address'].split('.');
        // let order = client['ip-address'].split(".")[3];
        let order = addresses_sorted.indexOf(client['ip-address']);
        let vlan = hostseg[2];
        let hostid = hostseg[3];
        let id = client['mac-address'].replaceAll(":", "").replaceAll(".", "") + "-" + vlan; // sometime, it's an ip as key

        if(client['mac-address'] == 'ff:ff:ff:ff:ff:ff')
            continue;

        let elapsed = (now.getTime() / 1000) - client['timestamp'];
        let hostname = client['hostname'] ? client['hostname'] : ((hostid == 254) ? "routinx-ng" : "(unknown)");
        let rx = (client['rx'] != undefined) ? client['rx'] : null;
        let tx = (client['tx'] != undefined) ? client['tx'] : null;
        let hostclass = (!client['hostname']) ? 'text-muted darker' : '';
        let trclass = (elapsed > 1200) ? 'offline' : ''; // 20 min offline

        let totalrx = client['total-rx'] ? autosize(client['total-rx'] / 1024) : "--";
        let totaltx = client['total-tx'] ? autosize(client['total-tx'] / 1024) : "--";

        if($("#devices-node-" + id).length == 0) {
            let tr = $("<div>", {"id": "devices-node-" + id, "class": "d-flex device-node" + ((hostid == 254) ? " gateway" : "")});

            tr.append($('<div>', {'class': 'dd-mac'}).html(client['mac-address']));
            tr.append($('<div>', {'class': 'dd-ip'}).html("..."));
            tr.append($('<div>', {'class': 'dd-host text-truncate pe-3'}).html("..."));

            tr.append($('<div>', {'class': 'dd-rx-parent'}).append(
                $('<span>', {'class': 'dd-rx badge rounded-pill'}).html("...")
            ));
            tr.append($('<div>', {'class': 'dd-tx-parent'}).append(
                $('<span>', {'class': 'dd-tx badge rounded-pill'}).html("...")
            ));

            tr.append($('<div>', {'class': 'dd-rx-total-parent'}).append(
                $('<span>', {'class': 'dd-rx-total badge rounded-pill text-bg-dark inactive'}).html("...")
            ));
            tr.append($('<div>', {'class': 'dd-tx-total-parent'}).append(
                $('<span>', {'class': 'dd-tx-total badge rounded-pill text-bg-dark inactive'}).html("...")
            ));

            tr.append($('<div>', {'class': 'dd-wireless'})
                .append($('<span>', {'class': 'dd-wireless-network badge rounded-pill text-bg-dark'}))
                .append($('<span>', {'class': 'dd-wireless-signal badge rounded-pill'}))
                .append($('<span>', {'class': 'dd-wireless-online badge rounded-pill'}))
                .append($('<span>', {'class': 'dd-wireless-rate badge rounded-pill'}))
                .append($('<span>', {'class': 'dd-wireless-login badge rounded-pill text-info'}))
            );

            tr.append($('<div>', {'class': 'dd-online-parent text-end'}).append(
                $('<span>', {'class': 'dd-online badge text-bg-dark rounded-pill'}).html(elapsedstr(elapsed.toFixed(0)))
            ));

            $('.devices').append(tr);
        }

        $("#devices-node-" + id).removeClass('offline').removeClass('discard').addClass(trclass).css("order", order);

        $("#devices-node-" + id + " .dd-mac").html(client['mac-address']);
        $("#devices-node-" + id + " .dd-ip").html(client['ip-address']);
        $("#devices-node-" + id + " .dd-host").removeClass('text-muted darker').addClass(hostclass).html(hostname);

        $("#devices-node-" + id + " .dd-rx").removeClass(classes_states).addClass(rxtxclass(rx));
        $("#devices-node-" + id + " .dd-rx").html(downarrow + shortrate(rx));
        $("#devices-node-" + id + " .dd-tx").removeClass(classes_states).addClass(rxtxclass(tx));
        $("#devices-node-" + id + " .dd-tx").html(uparrow + shortrate(tx));

        $("#devices-node-" + id + " .dd-rx-total").html(downarrow + totalrx);
        $("#devices-node-" + id + " .dd-tx-total").html(uparrow + totaltx);

        $("#devices-node-" + id + " .dd-online").html(elapsedstr(elapsed.toFixed(0)));

        if(wireless_clients[id] !== undefined) {
            let target = wireless_clients[id];

            let signal = parseFloat(target['rssi']);
            let sigclass = wireless_signal(signal);
            let network = target['ssid']; // wireless_short_ssid[target['ssid']];
            let online = target['active']; // target['online']; // wireless_online(target['online']);
            let onstyle = "text-bg-dark"; // (target['online'] > 3600) ? "text-bg-dark" : "text-bg-light";

            // $("#devices-node-" + id + " .dd-wireless-network").html(network);
            // $("#devices-node-" + id + " .dd-wireless-signal").html(sigicon + signal + ' dBm');
            $("#devices-node-" + id + " .dd-wireless-signal").html(signal + ' dBm');
            $("#devices-node-" + id + " .dd-wireless-signal").addClass(sigclass + ' text-bg-dark');
            $("#devices-node-" + id + " .dd-wireless-rate").html(target['rate'] + ' Mbps');
            $("#devices-node-" + id + " .dd-wireless-rate").addClass('text-bg-dark');
            $("#devices-node-" + id + " .dd-wireless-online").html(online);
            $("#devices-node-" + id + " .dd-wireless-online").addClass(onstyle);

            /*
            if(target['login'])
                $("#devices-node-" + id + " .dd-wireless-login").html(target['login']);
            */
        }

        /*
        var tr = $('<tr>', trclass);
        tr.append($('<td>').html(client['mac-address']));
        tr.append($('<td>').html(client['ip-address']));
        tr.append($('<td>', hostclass).html(hostname));
        tr.append($('<td>', {'class': rxtxactive(rx)})
            .append($('<span>', {'class': rxtxclass(rx) + ' badge rounded-pill'}).html(downarrow + shortrate(rx)))
        );
        tr.append($('<td>', {'class': rxtxactive(tx)})
            .append($('<span>', {'class': rxtxclass(tx) + ' badge rounded-pill'}).html(uparrow + shortrate(tx)))
        );

        classes_states

        var badgeclass = 'badge text-bg-dark rounded-pill';
        var badgehtml = "---";

        var badge = $('<span>', {'class': badgeclass}).html(elapsedstr(elapsed.toFixed(0)));
        tr.append($('<td>', {'class': 'text-end'}).append(badge));

        $('.devices').append(tr);
        */
    }

    // cleaning expired entries
    $(".devices .discard").remove();
}

var dnsentries = [];

function dns_activity(entry) {
    dnsentries.push(entry);
    console.log(dnsentries);

    if(dnsentries.length > 3)
        dnsentries = dnsentries.slice(1);

    $(".dns-activity").empty();

    for(var line in dnsentries) {
        var entry = dnsentries[line];
        console.log(entry);

        var tr = $("<tr>");
        tr.append($("<td>", {"class": "host"}).append($("<span>", {"class": "badge"}).html(entry["host"])));
        tr.append($("<td>", {"class": "query"}).html(entry["query"]));

        $(".dns-activity").append(tr);
    }
}

/*
function docsis(payload) {
    $('.docsis-signal').empty();

    if(payload['up'] == undefined) {
        $('.docsis-signal').addClass('system-error');
        $('.docsis-signal').append($('<span>', {'class': 'text-danger'}).html("Measurment failed"));
        return;
    }

    $('.docsis-signal').removeClass('system-error');

    for(var i in payload['up']) {
        var channel = payload['up'][i];

        var badge = 'badge docsis-value rounded-pill mx-1 ';

        if(channel['txpower'] > 44) {
            badge += 'text-bg-success';

        } else if (channel['txpower'] > 40) {
            badge += 'text-bg-warning';

        } else {
            badge += 'text-bg-danger';
        }

        $('.docsis-signal').append($('<span>', {'class': badge}).html(channel['txpower'].toFixed(1)));
        // console.log(channel);
    }
}
*/

var trafficup = [];
var trafficdown = [];
var trafficitems = 0;
var trafficplotup = null;
var trafficplotdown = null;

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

    let possible = "text-bg-danger text-bg-warning text-bg-secondary text-bg-dark";

    for(var ifid in node['network']) {
        var intf = node['network'][ifid];

        if(intf['name'] != 'wan')
            continue;

        /*
        var tr = $('<tr>');
        tr.append($('<td>').html($('<span>', {'class': 'glyphicon glyphicon-small glyphicon-arrow-down'})));

        var badge = $('<span>', {'class': rxtxclass(intf['rx_rate']) + ' badge rounded-pill'});
        badge.html(shortrate(intf['rx_rate']));
        tr.append($('<td>').html(badge));

        var badge = $('<span>', {'class': rxtxclass(intf['tx_rate']) + ' badge rounded-pill'});
        badge.html(shortrate(intf['tx_rate']));
        tr.append($('<td>').html(badge));

        tr.append($('<td>').html($('<span>', {'class': 'glyphicon glyphicon-small glyphicon-arrow-up'})));

        $('.router').append(tr);
        */

        $("#router-rate .rr-rx").removeClass(possible).addClass(rxtxclass(intf['rx_rate'])).html(shortrate(intf['rx_rate']));
        $("#router-rate .rr-tx").removeClass(possible).addClass(rxtxclass(intf['tx_rate'])).html(shortrate(intf['tx_rate']));

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
const redsrv = {
    "10.241.100.230": "storix-ng",
    "10.241.100.240": "servix-ng",
    "10.241.100.250": "routinx-ng",
};
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

        // ignore redfish login history
        if(entry['message'].includes("and REDFISH."))
            continue;

        // skip logout messages
        if(entry['messageid'] == "USR0032")
            continue;

        // Skip entries older than 4 days
        if(entry['timestamp'] < (new Date() - (4 * 86400)))
            continue;

        let datestr = moment.unix(entry['timestamp']).format("DD MMM HH:mm:ss");
        let dateb = $("<span>", {"class": "badge text-bg-dark me-2"}).html(datestr);
        let sourceb = $("<span>", {"class": "badge text-bg-dark me-2"}).html(redsrv[entry['source']]);

        var severity = redsev[entry['severity']];
        if(entry['messageid'] in redinfoid)
            severity = redinfoid[entry['messageid']];

        let messageb = $("<span>", {"class": "badge " + severity}).html(entry['message']);

        $(".redfishing").prepend($("<div>").append(dateb).append(sourceb).append(messageb));
    }
}

var summary_main_power = {};

function redfish_power_update(payload) {
    for(var key in payload) {
        let server = payload[key];
        summary_main_power[key] = server;

        $(".rtinfo-maxux-" + key + " td.nn-swap").html(server.power + " watt");
    }
}


var cronjob_main_counter = 0;

function cronjob() {
    cronjob_main_counter += 1;

    if(cronjob_main_counter > 3600)
        location.reload();

    if(wireless_last_update < (Date.now() / 1000) - 30) {
        $('#wireless-body').addClass('system-error');

    } else {
        $('#wireless-body').removeClass('system-error');

    }
}

$(document).ready(function() {
    connect();
    setInterval(cronjob, 1000);
});
