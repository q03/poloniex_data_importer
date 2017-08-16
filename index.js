"use strict";
var autobahn = require('autobahn');
var _ = require('lodash');

var config = require('./config.json');
const Influx = require('influx');


var connection = new autobahn.Connection({
    url: config.poloniex.uri,
    realm: config.poloniex.realm
});

const influx = new Influx.InfluxDB({
    database: config.influx.database,
    host: config.influx.host,
    port: config.influx.port,
    username: config.influx.username,
    password: config.influx.password,
    schema: [
        {
            measurement: config.influx.measurement,
            fields: {
                last: Influx.FieldType.FLOAT,
                lowestAsk: Influx.FieldType.FLOAT,
                highestBid: Influx.FieldType.FLOAT,
                percentChange: Influx.FieldType.FLOAT,
                baseVolume: Influx.FieldType.FLOAT,
                quoteVolume: Influx.FieldType.FLOAT,
                isFrozen: Influx.FieldType.BOOLEAN,
                last24hrHigh: Influx.FieldType.FLOAT,
                last24hrLow: Influx.FieldType.FLOAT
            },
            tags: [
                'currencyPair'
            ]
        }
    ]
});

influx.getDatabaseNames()
    .then(names => {
        if( !_.includes(names, config.influx.database) ) {
            console.log('Creating database: ' + config.influx.database);
            return influx.createDatabase(config.influx.database);
        }
});

connection.onopen = function (session) {
    console.log("Websocket connection opened");
    function tickerEvent(args, kwargs) {
        influx.writePoints([
            {
                measurement: config.influx.measurement,
                tags: {currencyPair: args[0]},
                fields: {
                    last: parseFloat(args[1]),
                    lowestAsk: parseFloat(args[2]),
                    highestBid: parseFloat(args[3]),
                    percentChange: parseFloat(args[4]),
                    baseVolume: parseFloat(args[5]),
                    quoteVolume: parseFloat(args[6]),
                    isFrozen: (args[7] === '1'),
                    last24hrHigh: parseFloat(args[8]),
                    last24hrLow: parseFloat(args[9])
                }
            }
        ]).catch(err => {
            console.log('Error saving data to InfluxDB! ' + err.stack);
        });
        console.debug('Data saved to influx: ', args.join());
    }
    session.subscribe('ticker', tickerEvent);
}
connection.onclose = function () {
    console.log("Websocket connection closed");
}
connection.open();