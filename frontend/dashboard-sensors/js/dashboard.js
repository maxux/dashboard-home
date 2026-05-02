//
// Resolve a single time elements and cache their addresses
//
function root_resolve_elements(group) {
    for(var key in group) {
        group[key] = document.getElementById(key);
    }
}

//
// Resolve a single time power elements (card root)
//
function power_resolve_elements(group) {
    for(var key in group) {
        if(key == "-1") {
            continue;
        }

        for(var sub in group[key]) {
            group[key][sub] = document.querySelector(`.card-power[data-channel='${sub}-${key}']`);
        }
    }

    group["-1"] = true;
}

//
// Round a duration based on highest unit available
//
function secondsToDuration(seconds) {
    const distance = seconds;
    if((distance / 86400) > 1) {
        return {days: Math.floor(distance / 86400)};
    }

    if(((distance % 86400) / 3600) > 1) {
        return {hours: Math.floor((distance % 86400) / 3600)};
    }

    if(((distance % 3600) / 60) > 1) {
        return {minutes: Math.floor((distance % 3600) / 60)};
    }

    return {seconds: seconds}
}

function zlead(x) {
    return (x < 10) ? "0" + x : x;
}

Date.prototype.nicedate = function() {
    return this.getFullYear() + "-" + zlead(this.getMonth() + 1) + "-" + zlead(this.getDate());
}

Date.prototype.nicetime = function() {
     return zlead(this.getHours()) + ":" + zlead(this.getMinutes()) + ":" + zlead(this.getSeconds());
}

Date.prototype.dayname = function() {
    return this.toLocaleDateString("en-US", {weekday: 'long'});
}

const time_elements = {
    "current-time": null,
    "current-date": null,
    "current-day": null,
};

const dummy_inner_text = {
    innerText: "",
};

//
// Update every 'updated' flagged element to refresh it's Duration label
// and update label color if no update occured for some time
//
function refresh_updated_badge() {
    const xnow = new Date();
    const now = xnow.getTime() / 1000;

    const dufmt = new Intl.DurationFormat("en", {style: "long"});

    document.querySelectorAll(".updated").forEach((update) => {
        update.classList.remove(...ups_classes);

        // Default timeout to 240 seconds
        let timeout = 240;
        let updater = update;

        // Special element not updating label but only class
        if(update.dataset.refresh && update.dataset.refresh == "class") {
            updater = dummy_inner_text;
        }

        // Element individual timeout optional override
        if(update.dataset.timeout) {
            timeout = parseInt(update.dataset.timeout);
        }

        // No timestamp attached yet
        if(!update.dataset.timestamp) {
            // Set a placeholder
            updater.innerText = "...";
            update.classList.add("text-bg-secondary");
            return;
        }

        const timestamp = parseInt(update.dataset.timestamp);
        const distance = Math.floor(now - timestamp);
        const duration = secondsToDuration(distance);

        // Updated just right now
        if(distance < 1) {
            updater.innerText = "just right now";
            update.classList.add("text-bg-dark");
            return;
        }

        // Updated a few moment ago or a long time ago
        updater.innerText = `${dufmt.format(duration)} ago`;
        if(distance > timeout) {
            update.classList.add("text-bg-danger");

        } else {
            update.classList.add("text-bg-dark");
        }
    });
}

function update_time() {
    const now = new Date();

    // Resolve elements address a single time
    if(time_elements["current-time"] == null) {
        root_resolve_elements(time_elements);
    }

    // Refresh current Time and Date
    time_elements["current-time"].innerText = now.nicetime();
    time_elements["current-date"].innerText = now.nicedate();
    time_elements["current-day"].innerText = now.dayname();

    // Refresh last update badges
    refresh_updated_badge();
}

var localweather = {
    'timestamp': 0,
};

var localpower = {
    'lastupdate': 0,
};

// extracted from backlog python code
let sensorsgroups = {
    // Desktop [Desktop, Kitchen, Bedroom]
    '28-ffc0d7021703c2': ['28-ffc0d7021703c2', '28-ff641f43cac675', '28-3709b812210156'],

    // Freezer: [Freezer (large), Freezer (small)]
    '28-ff23a602170371': ['28-ff23a602170371', '28-ff2f0103170457'],

    // Fridge: [Fridge (food), Fridge (drink, top), Fridge (drink, low)]
    '28-ffd3b4021703e8': ['28-ffd3b4021703e8', '28-ff274345160329', '28-ffd656471603b4'],

    // Boiler Room: [Boiler Room, Mezzanine, Terrace]
    '28-ff641e93a42b71': ['28-ff641e93a42b71', '28-8245ca122101dd', '28-1f55b4122101e7'],
};

var localsensors =  {
    "28-ff641e93a42b71": { // servers-room
        'high': 28,  'warn': 25,  'normal': 18,  'low': 15,
        'min': 0, 'max': 40, 'color': '#FF6B1A', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "10-000802776315": {
        'high': 31,  'warn': 26,  'normal': 23,  'low': 21,
        'min': 15, 'max': 35, 'color': '#D5ACDE', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "10-000802775cc7": {
        'high': 31,  'warn': 26,  'normal': 23,  'low': 21,
        'min': 15, 'max': 35, 'color': '#D5ACDE', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "28-ff2f0103170457": { // fridge (freezer)
        'high': -14, 'warn': -18, 'normal': -26, 'low': -32,
        'min': -32, 'max': -15, 'color': '#00ADA9', 'threshold': -18,
        'timestamp': 0, 'value': 0
    },
    "28-ff23a602170371": { // freezer (large)
        'high': -14, 'warn': -18, 'normal': -26, 'low': -32,
        'min': -25, 'max': -5, 'color': '#FFC636', 'threshold': -18,
        'timestamp': 0, 'value': 0
    },
    "28-ffd3b4021703e8": { // fridge (food)
        'high': 9,   'warn': 5.5, 'normal': 2,   'low': 1,
        'min': 0, 'max': 20, 'color': '#A2A632', 'threshold': 8,
        'timestamp': 0, 'value': 0
    },
    "28-ffad2702170593": { // kitchen (old)
        'high': 28,  'warn': 25,  'normal': 18,  'low': 15,
        'min': 15, 'max': 35, 'color': '#649564', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "28-ff641f43cac675": { // kitchen (new)
        'high': 28,  'warn': 25,  'normal': 18,  'low': 15,
        'min': 15, 'max': 35, 'color': '#90A19D', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "28-ffc0d7021703c2": { // desktop
        'high': 28,  'warn': 25,  'normal': 18,  'low': 15,
        'min': 15, 'max': 35, 'color': '#196774', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "28-3709b812210156": { // bedroom
        'high': 28,  'warn': 25,  'normal': 18,  'low': 15,
        'min': 15, 'max': 35, 'color': '#F0941F', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "28-8245ca122101dd": { // mezzanine
        'high': 28,  'warn': 25,  'normal': 18,  'low': 15,
        'min': 15, 'max': 35, 'color': '#00B3AD', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "28-ff274345160329": { // fridge drink (top)
        'high': 18,  'warn': 25,  'normal': 17,  'low': 12,
        'min': 10, 'max': 20, 'color': '#4F81F7', 'threshold': 30,
        'timestamp': 0, 'value': 0,
    },
    "28-ffd656471603b4": { // fridge drink (low)
        'high': 15,  'warn': 10,  'normal': 4,  'low': 1,
        'min': 0, 'max': 20, 'color': '#FF4858', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "28-1f55b4122101e7": { //
        'high': 28,  'warn': 25,  'normal': 18,  'low': 15,
        'min': 15, 'max': 35, 'color': '#649564', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "28-ffc0d7021703c2": { //
        'high': 28,  'warn': 25,  'normal': 18,  'low': 15,
        'min': 15, 'max': 35, 'color': '#649564', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
    "28-ff641f75ab5b08": { // door locker
        'high': 35,  'warn': 30,  'normal': 18,  'low': 15,
        'min': 15, 'max': 35, 'color': '#649564', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
};

var extrasensors = {
    "28-ffc0d7021703c2": {},
    "28-ffc5fe441603d7": {},
    "28-ff2f0103170457": {},
    "28-ff274345160329": {},
    "28-ffd656471603b4": {},
    "28-1f55b4122101e7": {},
    "28-ff641f75ab5b08": {},
};

function sensor_color(id, value) {
    if(value > localsensors[id]['high'])
        return "text-danger"

    if(value > localsensors[id]['warn'])
        return "text-warning";

    if(value > localsensors[id]['normal'])
        return "text-success";

    if(value > localsensors[id]['low'])
        return "text-primary";

    return "text-muted";
}

function update_sensor(sensor) {
    $('div.sensor-' + sensor['id'] + ' .sname').css("color", sensor['color']);

    const update = document.querySelector(`div.sensor-${sensor['id']} .updated`);
    if(update) {
        update.dataset.timestamp = sensor["timestamp"];
    }

    $('div.sensor-' + sensor['id'] + ' .value span.t').attr("class", "t");
    $('div.sensor-' + sensor['id'] + ' .value span.t').addClass(sensor_color(sensor['id'], sensor['value']));
    $('div.sensor-' + sensor['id'] + ' .value span.t').html(sensor['value'].toFixed(2) + '°C');

    if(sensor['value-new'] != undefined)
        $('div.sensor-' + sensor['id'] + ' .value span.h').html('[' + sensor['value-new'].toFixed(0) + ' %]');

    // update_sensors_time();
}

//
// power management
//
const power_elements = {
    "-1": null,
    "0": {"watt": null, "volt": null},
    "1": {"watt": null, "volt": null},
    "2": {"watt": null, "volt": null},
    "3": {"watt": null, "volt": null},
};

function power_element_value(channel, sub) {
    if(!power_elements[channel]) {
        return null;
    }

    if(!power_elements[channel][sub]) {
        return null;
    }

    const card = power_elements[channel][sub];

    // .card-power > h2 > .power-value
    return card.firstElementChild.firstElementChild;
}

//
// ups value parsing
//
function ups_value_percent(value) {
    return [parseFloat(value).toFixed(0), "%"];
}

function ups_value_minutes(value) {
    return [parseFloat(value), "Min"];
}

function ups_value_voltage(value, fixed) {
    return [parseFloat(value).toFixed(fixed), " v"];
}

function ups_value_temperature(value) {
    return [parseFloat(value).toFixed(1), "°C"];
}

function ups_value_prettify(data) {
    return data[0] + " " + data[1];
}

//
// ups range coloring
//
const ups_classes = [
    "text-bg-dark",
    "text-bg-success",
    "text-bg-warning",
    "text-bg-danger",
    "text-bg-info",
    "text-bg-secondary"
];

const ups_elements = {
    "ups-status": null,
    "ups-date-update": null,
    "ups-power-load": null,
    "ups-power-watt": null,
    "ups-battery-charge": null,
    "ups-battery-voltage": null,
    "ups-time-left": null,
    "ups-output-voltage": null,
    "ups-output-frequency": null,
    "ups-internal-temperature": null,
    "ups-live-time": null,
    "ups-live-data": null,
};

function ups_status(target, value) {
    target.innerText = value;
    target.classList.remove(...ups_classes);

    if(value == "ONLINE") {
        target.classList.add("text-bg-success");
        return;
    }

    target.classList.add("text-bg-warning");
}

function ups_power_load(target, source) {
    const value = ups_value_percent(source);
    target.innerText = ups_value_prettify(value);
    target.classList.remove(...ups_classes);

    if(value[0] < 2)
        return target.classList.add("text-bg-primary");

    if(value[0] < 48)
        return target.classList.add("text-bg-success");

    if(value[0] < 80)
        return target.classList.add("text-bg-warning");

    target.classList.add("text-bg-danger");
}

function ups_power_watt(target, source) {
    const value = ups_value_percent(source);
    const watt = 1980 * (value[0] / 100);

    target.innerText = ups_value_prettify(["~" + watt.toFixed(0), "w"]);
    target.classList.remove(...ups_classes);

    if(value[0] < 2)
        return target.classList.add("text-bg-primary");

    if(value[0] < 48)
        return target.classList.add("text-bg-success");

    if(value[0] < 80)
        return target.classList.add("text-bg-warning");

    target.classList.add("text-bg-danger");
}

function ups_battery_charge(target, source) {
    const value = ups_value_percent(source);
    target.innerText = ups_value_prettify(value);
    target.classList.remove(...ups_classes);

    if(value[0] < 21)
        return target.classList.add("text-bg-danger");

    if(value[0] < 40)
        return target.classList.add("text-bg-warning");

    target.classList.add("text-bg-success");
}

function ups_battery_voltage(target, source) {
    const value = ups_value_voltage(source, 1);
    target.innerText = ups_value_prettify(value);
    target.classList.remove(...ups_classes);
    target.classList.add("text-bg-secondary");
}

function ups_time_left(target, source) {
    const value = ups_value_minutes(source);
    target.innerText = ups_value_prettify(value);
    target.classList.remove(...ups_classes);

    if(value[0] < 20)
        return target.classList.add("text-bg-danger");

    if(value[0] < 45)
        return target.classList.add("text-bg-warning");

    target.classList.add("text-bg-success");
}

function ups_output_voltage(target, source) {
    const value = ups_value_voltage(source, 0);
    target.innerText = ups_value_prettify(value);
    target.classList.remove(...ups_classes);

    if(value[0] > 243)
        return target.classList.add("text-bg-danger");

    if(value[0] < 190)
        return target.classList.add("text-bg-danger");

    if(value[0] < 220)
        return target.classList.add("text-bg-warning");

    target.classList.add("text-bg-success");
}

function ups_output_freq(target, source) {
    target.innerText = source;
    target.classList.remove(...ups_classes);
    target.classList.add("text-bg-secondary");
}

function ups_last_update(target, source) {
    // const items = source.split(" ");
    // target.innerText = items[1];
    target.dataset.timestamp = source;
}

function ups_internal_temperature(target, source) {
    const value = ups_value_temperature(source);
    target.innerText = ups_value_prettify(value);
    target.classList.remove(...ups_classes);

    if(value[0] < 31)
        return target.classList.add("text-bg-success");

    if(value[0] < 36)
        return target.classList.add("text-bg-warning");

    target.classList.add("text-bg-danger");
}

//
// ups main updater
//

function ups_update(ups) {
    const x = (n) => { return ups_elements[n]; }

    // Resolve a single time ups elements
    if(ups_elements["ups-status"] == null) {
        root_resolve_elements(ups_elements);
    }

    ups_status(x("ups-status"), ups['STATUS']);

    ups_power_load(x("ups-power-load"), ups['LOADPCT']);
    ups_last_update(x("ups-date-update"), ups['EPOCH']);
    ups_power_watt(x("ups-power-watt"), ups['LOADPCT']);
    ups_battery_charge(x("ups-battery-charge"), ups['BCHARGE']);
    ups_battery_voltage(x("ups-battery-voltage"), ups['BATTV']);
    ups_time_left(x("ups-time-left"), ups['TIMELEFT']);
    ups_output_voltage(x("ups-output-voltage"), ups['OUTPUTV']);
    ups_output_freq(x("ups-output-frequency"), ups['LINEFREQ']);
    ups_internal_temperature(x("ups-internal-temperature"), ups['ITEMP']);
}

function ups_live_update(event) {
    const x = (n) => { return ups_elements[n]; }

    const datefmt = new Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
    });

    const evtime = new Date(event["timestamp"] * 1000);
    const xdatestr = datefmt.format(evtime);

    x("ups-live-time").innerText = xdatestr;
    x("ups-live-data").innerText = event["message"];

    x("ups-live-data").classList.remove(...ups_classes);
    x("ups-live-data").classList.add(`text-bg-${event['severity']}`);
}

/*
function rain_chart(data) {
    // console.log(data);

    var serie = [];
    var reg = new RegExp("[- :]+", "g");

    for(var idx in data) {
        var temp = data[idx]['time'].split(reg);
        var when = new Date(temp[0], temp[1] - 1, temp[2], temp[3], temp[4]);

        serie.push([when, data[idx]['intensity']]);
    }

    $.plot("#chart-rain", [serie], {
        series: {
            color: '#BFBFBF',
            curvedLines: { apply: true, active: true, monotonicFit: true },
        },
        grid: {
           borderWidth: { top: 1, right: 0, bottom: 0, left: 0 },
           borderColor: { top: "#303030" }
        },
        lines: { show: true, fill: true },
        xaxis: { mode: "time", timezone: "browser" },
        yaxis: { min: 0, max: 9, show: false },
    });
}
*/

function prettifyday(source) {
    var pretty = [];
    var values = {};

    for(var idx in source) {
        var date = new Date(source[idx][0]);
        var formatted = date.toLocaleString("en-us", { month: "short", day: "2-digit" });

        if(values[formatted] == undefined)
            values[formatted] = {};

        var phase = source[idx][1];
        if(pretty[phase] == undefined)
            pretty[phase] = [];

        // compute channel 1 which is (channel 2 - channel 3)
        var value = source[idx][2];
        if(phase == 2) {
            value -= values[formatted][0] + values[formatted][1];

            if(value < 0)
                value = 0;
        }

        pretty[phase].push([formatted, value]);
        values[formatted][phase] = value;
    }

    // console.log(pretty);

    return pretty;
}

var socket;
var poweriter = 0;

function connect() {
    // socket = new WebSocket("wss://" + window.location.hostname + "/websocket/dashboard");
    socket = new WebSocket("ws://10.241.10.254:30501");

    socket.onopen = function() {
        console.log("websocket open");
        $('#disconnected').hide();
    }

    socket.onmessage = function(msg) {
        json = JSON.parse(msg.data);
        // console.log(json);

        switch(json['type']) {
            case "weather":
                // console.log(json['payload'])
                localweather['timestamp'] = json['payload']['updated'];
                var today = json['payload']['zone']['today'];

                $("#weather-city").html("Liège");
                $("#weather-backtime").html("Right now");
                $("#weather-temperature").html(today['temp'] + '°C');
                $("#weather-wind").html(today['wind_speed_to'] + ' <span class="unit">km/h</span>');
                $("#weather-hum").html(today['ppcp'] + ' <span class="unit">%</span>');

                // rain_chart(json['payload']['rain90min']['data']);
            break;

            case "sensors":
                for(var id in json['payload']) {
                    if(localsensors[id] == undefined)
                        continue;

                    localsensors[id]['timestamp'] = json['payload'][id]['timestamp'];
                    localsensors[id]['value'] = json['payload'][id]['value'] / 1000;
                    localsensors[id]['id'] = id

                    update_sensor(localsensors[id]);
                }

                for(var id in json['payload']) {
                    if(extrasensors[id] == undefined)
                        continue;

                    $('div#extra-sensors-' + id + ' span.value').html(json['payload'][id]['value']);
                }
            break;

            case "sensors-backlog":
                var id = json['payload']["id"];

                if(localsensors[id] == undefined)
                    break;

                if(sensorsgroups[id] == undefined)
                    break;

                // colors lines based on sensor color defined
                var colors = [];
                for(let i in sensorsgroups[id])
                    colors.push(localsensors[sensorsgroups[id][i]]['color']);

                $.plot("#chart-" + id, json['payload']['serie'], {
                    colors: colors,
                    series: {
                        // color: "#AD2222",
                        // threshold: {
                            // below: localsensors[id]['threshold'],
                            // color: localsensors[id]['color'],
                        // },
                    },
                    xaxis: {
                        mode: "time",
                        timezone: "browser",
                        tickSize: [4, "hour"],
                        align: "center",
                    },
                    yaxis: {
                        min: localsensors[id]['min'],
                        max: localsensors[id]['max'],
                        tickFormatter: function(v, axis) { return v.toFixed(0) + "°C"; },
                    },
                    grid: {
                        borderColor: "#222222",
                        labelMargin: 10,
                    }
                });
            break;

            case "power":
                if(!power_elements["-1"]) {
                    power_resolve_elements(power_elements);
                }

                for(var channel in json['payload']) {
                    const chaninfo = json["payload"][channel];

                    if(!power_elements[channel]) {
                        continue;
                    }

                    const group = power_elements[channel];

                    for(var sub of ["watt", "volt"]) {
                        const element = power_element_value(channel, sub);
                        if(!element) {
                            continue;
                        }

                        // value element
                        element.innerText = chaninfo[sub].toFixed(0);

                        // card timestamp holder
                        group[sub].dataset.timestamp = chaninfo["timestamp"];
                    }

                    /*
                    if(group["watt"]) {
                        const watt = chaninfo["watt"].toFixed(0);
                        group["watt"].querySelector("h2 .power-value").innerText = watt;
                        group["watt"].dataset.timestamp = chaninfo["timestamp"];
                    }

                    if(group["volt"]) {
                        const volt = chaninfo["volt"].toFixed(0);
                        group["volt"].firstElementChild.innerText = volt;
                        group["volt"].dataset.timestamp = chaninfo["timestamp"];
                    }
                    */
                }
            break;

            case "power-backlog":
                $.plot("#chart-power-backlog", [json['payload']], {
                    series: {
                        color: "#00ABBD",
                        bars: {
                            show: true,
                            fill: true,
                            barWidth: 0.75,
                            align: "center"
                        },
                    },
                    xaxis: {
                        mode: "categories",
                        tickLength: 0,
                        labelHeight: 18,
                    },
                    yaxis: {
                    },
                    grid: {
                        borderColor: "#222222",
                        labelMargin: 10,
                    },
                });
            break;

            case "gpio-status":
                var payload = json['payload'];
                // console.log(payload);

                $('#gpio-table').empty();

                for(var gpio in payload) {
                    var item = payload[gpio];

                    // skipping not set items
                    if(!item['type'])
                        continue;

                    var status = (!item['value']) ? 'text-success online' : 'text-muted';
                    var boxclass = 'col-md-4 gpio-item ' + status;

                    var channel = $('<div>', {'class': boxclass}).html(item['name']);

                    $('#gpio-table').append(channel);
                }
            break;

            case "power-backlog-days":
                var serie = prettifyday(json['payload']);

                $.plot("#chart-power-backlog-70days", serie, {
                    colors: ["#26C4A5", "#ACE08C", "#F2B652"],
                    series: {
                        stack: true,
                        bars: {
                            show: true,
                            barWidth: 0.75,
                            align: "center",
                        },
                    },
                    xaxis: {
                        mode: "categories",
                        tickLength: 0,
                        ticks: 2,
                        tickSize: 2,
                        tickFormatter: function(v, axis) { return Object.keys(axis.categories)[v]; },
                        labelHeight: 18,
                    },
                    yaxis: {
                        autoscaleMargin: null,
                    },
                    grid: {
                        borderColor: "#222222",
                        labelMargin: 10,
                    },
                });
            break;

            case "ups":
                ups_update(json['payload']);
            break;

            case "ups-live":
                ups_live_update(json['payload']);
            break;

            case "pony":
                const state = json["payload"]["state"];
                const stclass = {"up": "text-bg-success", "down": "text-bg-secondary"};
                const statestr = {"up": "charging", "down": "discharging"};

                document.querySelector(".pony-card .state").innerText = statestr[json["payload"]["state"]];
                document.querySelector(".pony-card .state").classList.remove("text-bg-success", "text-bg-secondary");
                document.querySelector(".pony-card .state").classList.add(stclass[state]);

                document.querySelector(".pony-card .level").innerText = json["payload"]["level"] + " %";
                document.querySelector(".pony-card .updated").dataset.timestamp = json["payload"]["update"];
            break;

            case "rtinfo":
            case "rtinfo-local":
            case "ping":
            case "dhcp":
            case "wireless":
            case "arp":
            case "devices":
            case "docsis-levels":
            case "redfishing":
            case "redfish-power":
            case "switch-status":
                // ignore them
            break;

            default:
                console.log("Unknown type", json['type']);
                console.log(json);
        }
    }

    socket.onclose = function() {
        $('#disconnected').show();
        setTimeout(connect, 2000);
    }
}


$(document).ready(function() {
    setInterval(update_time, 1000);
    update_time();

    connect();
});
