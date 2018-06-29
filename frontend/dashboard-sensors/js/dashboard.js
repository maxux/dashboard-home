function zlead(x) {
    return (x < 10) ? "0" + x : x;
}

Date.prototype.today = function() {
    return this.getFullYear() + "-" + zlead(this.getMonth() + 1) + "-" + zlead(this.getDate());
}

Date.prototype.timeNow = function() {
     return zlead(this.getHours()) + ":" + zlead(this.getMinutes()) + ":" + zlead(this.getSeconds());
}

Date.prototype.dayName = function() {
    return this.toLocaleDateString("en-US", {weekday: 'long'});
}

function update_time() {
    var now = new Date();

    $('#current-time').html(now.timeNow());
    $('#current-date').html(now.today());
    $('#current-day').html(now.dayName());

    update_sensors_time();
    update_weather_time();
}

var localweather = {
    'timestamp': 0
};

var localsensors =  {
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
    /*
    "dht22-1-temp": {
        'high': 31,  'warn': 26,  'normal': 23,  'low': 21,
        'min': 15, 'max': 35, 'color': '#D5ACDE', 'threshold': 30,
        'timestamp': 0, 'value': 0, 'value-new': 0,
    },
    */
    "28-041703012fff": {
        'high': -14, 'warn': -18, 'normal': -26, 'low': -32,
        'min': -32, 'max': -15, 'color': '#E87851', 'threshold': -20,
        'timestamp': 0, 'value': 0
    },
    "28-031702b4d3ff": {
        'high': 9,   'warn': 5.5, 'normal': 2,   'low': 1,
        'min': 0, 'max': 15, 'color': '#295987', 'threshold': 8,
        'timestamp': 0, 'value': 0
    },
    "28-05170227adff": {
        'high': 28,  'warn': 25,  'normal': 18,  'low': 15,
        'min': 15, 'max': 35, 'color': '#649564', 'threshold': 30,
        'timestamp': 0, 'value': 0
    },
};

function update_sensors_time() {
    var now = new Date();

    for(var id in localsensors) {
        var sensor = localsensors[id];

        // skip unset values
        if(sensor['timestamp'] == 0)
            continue;

        var elapsed = (now.getTime() / 1000) - sensor['timestamp'];
        $('div.sensor-' + sensor['id'] + ' .badge').html(elapsed.toFixed(0) + ' seconds ago');
        $('div.sensor-' + sensor['id'] + ' .badge').removeClass('text-danger');

        if(elapsed > 240) {
            $('div.sensor-' + sensor['id'] + ' .badge').addClass('text-danger');

            if(elapsed > 7200) {
                var hrs = (elapsed / 3600).toFixed(0);
                $('div.sensor-' + sensor['id'] + ' .badge').html(hrs + ' hours ago');
            }
        }
    }
}

function update_weather_time() {
    var now = new Date();

    if(localweather['timestamp'] == 0)
        return;

    var elapsed = (now.getTime() / 1000) - localweather['timestamp'];

    if(elapsed > 120)
        $('#weather-backtime').html((elapsed / 60).toFixed(0) + ' minutes ago');
    else
        $('#weather-backtime').html(elapsed.toFixed(0) + ' seconds ago');
}

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
    $('div.sensor-' + sensor['id'] + ' .value span.t').attr("class", "t");
    $('div.sensor-' + sensor['id'] + ' .value span.t').addClass(sensor_color(sensor['id'], sensor['value']));
    $('div.sensor-' + sensor['id'] + ' .value span.t').html(sensor['value'].toFixed(2) + '°C');

    if(sensor['value-new'] != undefined)
        $('div.sensor-' + sensor['id'] + ' .value span.h').html('[' + sensor['value-new'].toFixed(0) + ' %]');

    update_sensors_time();
}

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

function prettifyday(source) {
    var pretty = []

    for(var idx in source) {
        var date = new Date(source[idx][0]);
        var formatted = date.toLocaleString("en-us", { month: "short", day: "2-digit" });

        pretty.push([formatted, source[idx][1]]);
    }

    return pretty;
}

var socket;

function connect() {
    socket = new WebSocket("ws://home.maxux.net:30501/");

    socket.onopen = function() {
        console.log("websocket open");
        $('#disconnected').hide();
    }

    socket.onmessage = function(msg) {
        json = JSON.parse(msg.data);
        // console.log(json);

        switch(json['type']) {
            case "weather":
                localweather['timestamp'] = json['payload']['updated'];

                $("#weather-city").html("Liège");
                $("#weather-backtime").html("Right now");
                $("#weather-temperature").html(json['payload']['temp'] + '°C');
                $("#weather-wind").html(json['payload']['wind'] + ' <span class="unit">km/h</span>');
                $("#weather-hum").html(json['payload']['hum'] + ' <span class="unit">%</span>');

                rain_chart(json['payload']['rain90min']['data']);
            break;

            case "sensors":
                for(var id in json['payload']) {
                    /*
                    if(id == "dht22-1-hum")
                        localsensors["dht22-1-temp"]['value-new'] = json['payload'][id]['value'];
                    */

                    if(localsensors[id] == undefined)
                        continue;

                    localsensors[id]['timestamp'] = json['payload'][id]['timestamp'];
                    localsensors[id]['value'] = json['payload'][id]['value'];
                    localsensors[id]['id'] = id

                    update_sensor(localsensors[id]);
                }
            break;

            case "sensors-backlog":
                var id = json['payload']["id"];

                if(localsensors[id] == undefined)
                    break;

                $.plot("#chart-" + id, [json['payload']['serie']], {
                    series: {
                        color: "#AD2222",
                        threshold: {
                            below: localsensors[id]['threshold'],
                            color: localsensors[id]['color'],
                        },
                    },
                    xaxis: { mode: "time", timezone: "browser" },
                    yaxis: {
                        min: localsensors[id]['min'],
                        max: localsensors[id]['max'],
                        tickFormatter: function(v, axis) { return v.toFixed(1) + " °C"; }
                    },
                });
            break;

            case "power":
                var total = 0;

                for(var phase in json['payload']) {
                    var value = json['payload'][phase]['value'].toFixed(0);
                    total += parseInt(value);

                    $('.power-value-phase-' + phase).html(value + ' <span class="unit">W</span>');
                }

                $('.power-value-total').html(total + ' <span class="unit">W</span>');
            break;

            case "power-backlog":
                $.plot("#chart-power-backlog", [json['payload']], {
                    series: {
                        color: "#4C7DAD",
                        bars: {
                            show: true,
                            barWidth: 0.6,
                            align: "center"
                        }
                    },
                    xaxis: { mode: "categories", tickLength: 0 }
                });
            break;

            case "gpio-status":
                var payload = json['payload'];

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

                $.plot("#chart-power-backlog-70days", [serie], {
                    series: {
                        color: "#5B6C72",
                        bars: {
                            show: true,
                            barWidth: 0.8,
                            align: "center"
                        },
                    },
                    xaxis: { mode: "categories", tickLength: 0 }
                });
            break;

            case "rtinfo":
            case "ping":
            case "dhcp":
            case "wireless":
            case "arp":
            case "devices":
            case "docsis-levels":
                // ignore them
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


$(document).ready(function() {
    setInterval(update_time, 1000);
    update_time();

    connect();
});