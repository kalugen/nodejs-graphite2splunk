#!/usr/bin/env node

var net = require('net');
var http = require('http');

var port = 2004;
var address = '0.0.0.0'
var splunkHost = 'mxtlsplas01';
var splunkPort = 8088;
var splunkPath = '/services/collector/event';

function splunkCallback(response) {
    var str = ''
    response.on('data', function (chunk) {
      str += chunk;
    });

    response.on('end', function () {
      console.log(str);
    });
};

function parsedataPoint(data,hostname) {
    // Basic grafite procotol sends datapoints as strings, each string is a
    // 3 fields, space separated row, comprised of:
    // "measurement value timestamp"
    //
    // furthermore, in our measurement is a composite of:
    // "host_name.service.metric"

    var measurement = data[0].split('.');

    var dataPoint = {
        event: {},
        hostname: hostname
    };

    dataPoint.event.value = data[1];
    dataPoint.time        = data[2];

    dataPoint.event.mon_host   = measurement[0].replace('_','.');
    dataPoint.event.check_name = measurement[1];

    if (measurement.length < 3 && service == 'HOST') {
        dataPoint.event.type   = 'HOST';
        dataPoint.event.metric = 'PING';
    } else {
        dataPoint.event.type   = 'SERVICE';
        dataPoint.event.metric = measurement[2];
    }

    return dataPoint;
};

var server = net.createServer();
server.listen(port, address);

// Quando un client si collega...
server.on('connect', function(socket) {
    var inputData;

    socket.setEncoding('utf8');

    // Quando riceviamo dei dati, possibilmente "chunked"
    socket.on('data', function(chunk) {
        inputData += chunk;
    });

    // Quando il client ha finito di inviare i dati
    socket.on('end', function() {
        // call Splunk

        var event = parsedataPoint(inputData, socket.remoteAddress);

        var options = {
            host: splunkHost,
            port: splunkPort,
            path: splunkPath,
            method: 'POST',
            headers: {
                Authorization: splunkToken
            },
            body: event
        }

        var req = http.request(options, splunkCallback);
        req.end();
    });
});

