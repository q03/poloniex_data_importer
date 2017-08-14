"use strict";
var autobahn = require('autobahn');
var poloniexUri = "wss://api.poloniex.com";
var connection = new autobahn.Connection({
    url: poloniexUri,
    realm: "realm1"
});
const Influx = require('influx');
const influx = new Influx.InfluxDB({
    host: '172.16.0.1',
    database: 'qpol',
    schema: [
        {
            measurement: 'qpol_btc_currency',
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
        if( !names.includes('express_response_db') )    {
            return influx.createDatabase('qpol')
        }
})

connection.onopen = function (session) {
    console.log("Websocket connection opened");
    function tickerEvent(args, kwargs) {
        influx.writePoints([
            {
                measurement: 'qpol_btc_currency',
                tags: {currencyPair: args[0]},
                fields: {
                    last: parseFloat(args[1]),
                    lowestAsk: parseFloat(args[2]),
                    highestBid: parseFloat(args[3]),
                    percentChange: parseFloat(args[4]),
                    baseVolume: parseFloat(args[5]),
                    quoteVolume: parseFloat(args[6]),
                    isFrozen: (args[7] == '1'),
                    last24hrHigh: parseFloat(args[8]),
                    last24hrLow: parseFloat(args[9])
                }
            }
        ]).catch(err => {
            console.log('Error saving data to InfluxDB! ${err.stack}')
        });
    }
    session.subscribe('ticker', tickerEvent);
}
connection.onclose = function () {
    console.log("Websocket connection closed");
}
connection.open();