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

function percentstyle(percent) {
	return 'color: black;';
}

function percentvalue(value, total) {
	if(total == 0)
		return 0;

	return parseFloat(Math.floor((value / total) * 100));
}

function colorizesw(value, size) {
	if(value < 10)
		return {'class': 'text-muted'};

    if(value < 2)
		return {'class': 'text-muted'};

	if(value < 30)
		return {'class': 'text-info'};

	return colorize(value);
}

function colorize(value) {
	if(value < 8)
		return {'class': 'text-muted'};

    if(value < 18)
        return {'class': ''};

	if(value < 50)
		return {'class': 'text-info'};

	if(value < 80)
		return {'class': 'text-warning'};

	return {'class': 'text-danger'};
}

function loadcolor(value, cpu) {
	if(value < 0.8)
		return {'class': 'text-muted'};

    if(value < 1.5)
        return {'class': ''};

	if(value < cpu / 4)
		return {'class': 'text-info'};

	if(value < cpu)
		return {'class': 'text-warning'};

	return {'class': 'text-danger'};
}

function autosize(value) {
	var temp = value / 1024;
	var unitidx = 2;

	if(temp > 4096) {
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
function size(value, total) {
	uindex = 1;

	pc = Math.floor((value / total) * 100);

	for(; value > 1024; value /= 1024)
		uindex++;

	text = value.toFixed(2) + ' ' + units[uindex] + (total ? ' (' + pc + ' %)' : '');

	return $('<span>', {style: percentstyle(pc)}).html(text);
}

function streamsize(value) {
	uindex = 0;

	for(; value > 1024; value /= 1024)
		uindex++;

	text = value.toFixed(2) + ' ' + units[uindex];

	pc = ((uindex / rates.length) * 100);

	return $('<span>', {style: percentstyle(pc)}).html(text);
}

function rate(value) {
	value = value / 1024;
	uindex = 1;

	for(; value > 1024; value /= 1024)
		uindex++;

	return value.toFixed(2) + ' ' + rates[uindex];
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

	if(value < 5)
		return {'class': ''};

	if(value < 40)
		return {'class': 'text-info'};

	if(value < 60)
		return {'class': 'text-warning'};

	return {'class': 'text-danger'};
}

function colordisk(value) {
	// using MB/s
	value = value / 1024 / 1024;

	if(value < 1.2)
		return {'class': ''};

	if(value < 20)
		return {'class': 'text-info'};

	if(value < 100)
		return {'class': 'text-warning'};

	return {'class': 'text-danger'};
}

function colorbattery(battery) {
    if(battery.load == -1)
        return {'class': 'text-muted'};

    return {'class': ''};
}

function colorcputemp(text, value) {
    if(value == 0)
        return $('<span>', {'class': 'text-muted'}).html(text);

    if(value < 45)
        return $('<span>', {'class': 'text-muted'}).html(text);

    if(value < 55)
        return $('<span>', {'class': ''}).html(text);

    if(value < 65)
        return $('<span>', {'class': 'text-warning'}).html(text);

    return $('<span>', {'class': 'text-danger'}).html(text);
}

function colorhddtemp(text, value) {
    if(value == 0)
        return $('<span>', {'class': 'text-muted'}).html(text);

    if(value < 35)
        return $('<span>', {'class': 'text-muted'}).html(text);

    if(value < 45)
        return $('<span>', {'class': ''}).html(text);

    if(value < 50)
        return $('<span>', {'class': 'text-warning'}).html(text);

    return $('<span>', {'class': 'text-danger'}).html(text);
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
	if(value < 86400)
		return {'class': 'text-danger'};

	if(value < (86400 * 2))
		return {'class': 'text-warning'};

	return {'class': 'text-success'};
}

//
// return a celcius degree if exists
//
function degree(value, limit) {
	if(!value)
		return '<small>-</small>';

	return value + '°C';
}

//
// return formated percent format with different colors
// scaled with value. optional output text can be used
//
function percent(value, extra) {
	return value + ' %' + ((extra) ? ' (' + extra + ')' : '');
}

//
// parsing battery rtinfo object
//
function battery(battery) {
	var bat = '';

	if(battery.load == -1)
		return '<small>[AC]</small>';

	if(batpic[battery.status] != undefined)
		bat = batpic[battery.status] + ' ';

    var pc = battery.load;
    if(battery.load < 0 || battery.load > 100)
        pc = 100;

	return bat + percent(pc);
}

//
// build a 'summary' table node line
//
function summary_node(node, server) {
    var status = {'class': ''};

    if(node.lasttime + 30 < server.servertime)
        status['class'] = 'node-down';

    var tr = $('<tr>', status);

    var status = 'text-success';
    if(node.lasttime + 5 < server.servertime)
        status = 'text-warning';

    if(node.lasttime + 30 < server.servertime)
        status = 'text-danger';

    var hostname = $('<a>', {
        'data-toggle': "tooltip",
        'data-placement': "top",
        'title': new Date(node.lasttime * 1000),
        'href': '#',
        'class': status,

    }).tooltip().html(node.hostname);

    tr.append($('<td>', {'class': status}).append(hostname));

    var swap = 0;
    if(node.memory.swap_total > 0)
        swap = node.memory.swap_total - node.memory.swap_free;

    for(var index in node.loadavg)
        node.loadavg[index] = parseFloat(node.loadavg[index]).toFixed(2);

    var cpunr = node.cpu_usage.length - 1;
    var ram   = percentvalue(node.memory.ram_used, node.memory.ram_total);
    var swap  = node.memory.swap_total - node.memory.swap_free;
    var pswap = percentvalue(swap, node.memory.swap_total);

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
}


//
// build summary table
//
function summary(host, server, nodes) {
    $('#summary-' + host).empty();
    $('#summary-' + host).css('display', '');

    var thead = $('<thead>')
        .append($('<td>', {'class': 'td-8'}).html('Hostname'))
        .append($('<td>', {'class': 'td-3'}).html('CPU'))
        .append($('<td>', {'class': 'td-2'}).html('#'))
        .append($('<td>', {'class': 'td-10'}).html('RAM'))
        .append($('<td>', {'class': 'td-10'}).html('SWAP'))
        .append($('<td>', {'colspan': 3, 'class': 'td-10'}).html('Load Average'))
        .append($('<td>', {'class': 'td-8'}).html('Remote IP'))
        .append($('<td>', {'class': 'td-5'}).html('Time'))
        .append($('<td>', {'class': 'td-5'}).html('Uptime'))
        .append($('<td>', {'class': 'td-5'}).html('Battery'))
        .append($('<td>', {'class': 'td-4'}).html('CPU'))
        .append($('<td>', {'class': 'td-4'}).html('Disk'))
        .append($('<td>', {'class': 'td-8'}).html('Disks I/O'))
        .append($('<td>', {'class': 'td-8'}).html('Net RX'))
        .append($('<td>', {'class': 'td-8'}).html('Net TX'));

    $('#summary-' + host).append(thead);
    $('#summary-' + host).append($('<tbody>'));

    for(var n in nodes) {
        if(nodes[n].hostname == "prod-01") {
            $('#summary-' + host + ' tbody').append($('<tr>', {'class': 'spacer'}));
        }

        $('#summary-' + host + ' tbody').append(summary_node(nodes[n], server));
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
	$('body').attr('class', 'connected');

	//
	// ordering hostname
	//
	var hosts = [];
	var nodes = [];

	for(var x in json.rtinfo)
		hosts.push(json.rtinfo[x].hostname);

	hosts = hosts.sort();

    // push 'prod-01' on last line
	for(var n in hosts) {
        if(hosts[n] == "prod-01")
            arraymove(hosts, n, hosts.length - 1);
    }

	for(var n in hosts)
		for(var x in json.rtinfo)
			if(json.rtinfo[x].hostname == hosts[n])
				nodes.push(json.rtinfo[x]);

    // console.log(nodes);

	//
	// iterate over differents part showable/hiddable
	//
	summary(host, json, nodes);

    //
    // router information
    //
    for(var n in hosts)
        if(hosts[n] == "routinx")
            router_update(nodes[n]);
}

function call(host) {
    // ensure this source exists
    if(!$('#root-' + host).length) {
        var root = $('<div>', {'id': 'root-' + host});
        root.append($('<table>', {'class': "table table-hover table-condensed", 'id': "summary-" + host}));

        $('#content').append(root);
    }
}

var socket;

function connect() {
    socket = new WebSocket("ws://" + window.location.hostname + ":30501/");

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
                // ignore all of this
            break;

            case "rtinfo":
                call("maxux");
                parsing(json['payload'], 'maxux');
            break;

            case "ping":
                ping_update(json['payload']);
            break;

            case "wireless":
                wireless_update(json['payload']);
            break;

            case "devices":
                devices_update(json['payload']);
            break;

            case "docsis-levels":
                docsis(json['payload']);
            break;

            default:
                console.log("Unknown type");
                console.log(json);
        }
    }

    socket.onclose = function() {
        $('#disconnected').show();
        setTimeout(connect, 2000);
    }
}


function ping_update(ping) {
    $('.connectivity').empty();
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
    var badge = {'class': 'badge text-success'};

    if(latency < 40) {
        badge = {'class': 'badge'};

    } else if(latency < 80) {
        badge = {'class': 'badge text-warning'};

    } else {
        badge = {'class': 'badge text-danger'};
    }

    // var tr = $('<tr>');
    // tr.append($('<td>').html($('<small>').html(ping['name'])));
    // tr.append($('<td>').html($('<span>', {'class': 'glyphicon ' + status})));
    // tr.append($('<td>').html($('<span>', badge).html(latency.toFixed(2) + ' ms')));
    $('.ping-' + clname).removeClass('system-error');
    $('.ping-' + clname).html($('<span>', badge).html(latency.toFixed(2) + ' ms'));
}

function wireless_signal(value) {
    if(value < -80)
        return {'class': 'text-danger'};

    if(value < -70)
        return {'class': 'text-warning'};

    if(value < -55)
        return {'class': ''};

    return {'class': 'text-success'};
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
        return (value / 60).toFixed(0) + " min";

    var hm = hrsmin_from_sec(value);

    if(hm[0] < 24)
        return hm[0] + "h" + hm[1];

    var days = parseInt(hm[0] / 24);
    value -= (days * 86400);

    var hm = hrsmin_from_sec(value);

    return days + "d " + hm[0] + "h" + hm[1];
}

function wireless_update(clients) {
    $('.wireless').empty();
    // console.log(clients);

    var freqs = {
        "Maxux Network (2.4G)": "2G",
        "Maxux Network (5.2G)": "5G",
        "Maxux Legacy": "LL",
    };

    for(var bssid in clients) {
        var client = clients[bssid];
        var tr = $('<tr>');

        var online = wireless_online(client['online']);
        var signal = parseFloat(client['rssi']);
        var sigspan = '<span class="glyphicon glyphicon-small glyphicon-signal"></span> ';

        tr.append($('<td>').html(freqs[client['ssid']]));
        tr.append($('<td>').html(client['address']));
        // tr.append($('<td>').html(client['ip']));
        tr.append($('<td>').html('Rate: ' + client['linkrate'] + ' Mbps'));
        tr.append($('<td>', wireless_signal(signal)).html(sigspan + signal + ' dBm'));
        tr.append($('<td>').html('Online: ' + online));

        $('.wireless').append(tr);
    }
}

function rxtxclass(value) {
    if(value < 8 * 1024)
        return 'text-muted';

    if(value < 112 * 1024)
        return 'text-default';

    if(value < 1112 * 1024)
        return 'badge-warning';

    return 'badge-danger';
}

function rxtxactive(value) {
    if(value < 8 * 1024)
        return 'inactive';

    return 'active';
}

function clientscmp(a, b) {
    a = a['addr'].split('.');
    b = b['addr'].split('.');

    for(var i = 0; i < a.length; i++) {
        if((a[i] = parseInt(a[i])) < (b[i] = parseInt(b[i])))
            return -1;

        else if(a[i] > b[i])
            return 1;
    }

    return 0;
}

function devices_update(clients) {
    $('.devices').empty();

    var now = new Date();

    var downarrow = '<span class="glyphicon glyphicon-small glyphicon-arrow-down"></span> ';
    var uparrow = '<span class="glyphicon glyphicon-small glyphicon-arrow-up"></span> ';

    var oclients = []
    for(var host in clients)
        oclients.push({'addr': clients[host]['ip-address'], 'mac': host});

    oclients.sort(clientscmp);

    for(var index in oclients) {
        var client = clients[oclients[index]['mac']];
        var elapsed = (now.getTime() / 1000) - client['timestamp'];
        var hostname = client['hostname'] ? client['hostname'] : "(unknown)";
        var rx = (client['rx'] != undefined) ? client['rx'] : null;
        var tx = (client['tx'] != undefined) ? client['tx'] : null;
        var hostclass = (!client['hostname']) ? {'class': 'text-muted darker'} : {};
        var trclass = (elapsed > 3600) ? {'class': 'offline'} : {}; // 1h offline

        var tr = $('<tr>', trclass);
        tr.append($('<td>').html(client['mac-address']));
        tr.append($('<td>').html(client['ip-address']));
        tr.append($('<td>', hostclass).html(hostname));
        tr.append($('<td>', {'class': rxtxactive(rx)})
            .append($('<span>', {'class': rxtxclass(rx) + ' badge'}).html(downarrow + shortrate(rx)))
        );
        tr.append($('<td>', {'class': rxtxactive(tx)})
            .append($('<span>', {'class': rxtxclass(tx) + ' badge'}).html(uparrow + shortrate(tx)))
        );

        var badgeclass = 'badge pull-right';
        var badgehtml = "---";

        var badge = $('<span>', {'class': badgeclass}).html(elapsedstr(elapsed.toFixed(0)));
        tr.append($('<td>').append(badge));

        $('.devices').append(tr);
    }
}

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

        var badge = 'badge docsis-value ';

        if(channel['txpower'] > 49.5 && channel['txpower'] <= 51)
            badge += 'text-warning';

        if(channel['txpower'] > 51) {
            $('.docsis-signal').addClass('system-error');
            badge += 'text-danger';
        }

        $('.docsis-signal').append($('<span>', {'class': badge}).html(channel['txpower'].toFixed(1)));
        // console.log(channel);
    }
}

var trafficup = [];
var trafficdown = [];
var trafficitems = 0;
var trafficplotup = null;
var trafficplotdown = null;

function router_update(node) {
    $('.router').empty();
    // console.log(node);

    if(trafficitems == 0) {
        for(var i = 0; i < 60; i++)
            trafficup.push([new Date() - (i * 1000), null]);

        for(var i = 0; i < 60; i++)
            trafficdown.push([new Date() - (i * 1000), null]);

        trafficitems = trafficup.length;

        trafficplotup = $.plot("#chart-upload", [trafficup], {
            series: { color: '#1E90FF' },
            xaxis: { mode: "time", timezone: "browser", ticks: 3 },
            yaxis: { min: 0, },
        });

        trafficplotdown = $.plot("#chart-download", [trafficdown], {
            series: { color: '#F86565' },
            xaxis: { mode: "time", timezone: "browser", ticks: 3 },
            yaxis: { min: 0, },
        });
    }

    for(var ifid in node['network']) {
        var intf = node['network'][ifid];

        if(intf['name'] != 'eth0')
            continue;

        var tr = $('<tr>');
        tr.append($('<td>').html($('<span>', {'class': 'glyphicon glyphicon-small glyphicon-arrow-down'})));

        var badge = $('<span>', {'class': 'badge'});
        badge.html(shortrate(intf['rx_rate']));
        tr.append($('<td>').html(badge));

        var badge = $('<span>', {'class': 'badge'});
        badge.html(shortrate(intf['tx_rate']));
        tr.append($('<td>').html(badge));

        tr.append($('<td>').html($('<span>', {'class': 'glyphicon glyphicon-small glyphicon-arrow-up'})));

        $('.router').append(tr);

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

$(document).ready(function() {
    connect();
});
