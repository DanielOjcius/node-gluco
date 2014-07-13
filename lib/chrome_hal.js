var EventEmitter = require('events').EventEmitter;
var util = require('util');
var async = require('async');
// global: chrome


var ChromeHAL = function (device, connection) {
    EventEmitter.call(this);
    var self = this;
    var reading = false;

    self.write = function (buf, callback) {
        // TODO pass configurable interfaceId
        chrome.hid.send(connection.connectionId, 1, buf.toArrayBuffer(), callback);
    };

    self.read = function () {
        chrome.hid.receive(connection.connectionId, device.maxOutputReportSize, function (data) {
            self.emit('data', data);
            if (reading)
                process.nextTick.bind(self, self.read);
        });
    };

    self.on("newListener", function (name) {
        if (name === 'data' && !reading) {
            reading = true;
            self.read();
        }
    });

    self.on("removeListener", function (name) {
        if (name === 'data' && reading) {
            // HACK: It is unspecified if listener is in the list returned by emitter.listeners(event).
            process.nextTick.bind(self, function () {
                if (self.listeners().length === 0)
                    reading = false;
            });
        }
    });

    return self;
};

util.inherits(ChromeHAL, EventEmitter);


var availableUSBDevices = function (callback) {
    var deviceIDs = chrome.runtime.getManifest().permissions
        .map(function(item) {
            return item.usbDevices ? item.usbDevices : []; // all usbDevice sections
        })
        .reduce(function (a, b) {
            return a.concat(b); // flatten
        });
    async.map(deviceIDs, function (item, next) {
        chrome.hid.getDevices(item, function (devices) {
            next(null, devices);
        });
    }, function (err, devices) {
        var vendor_product_ids = devices.reduce(function (a, b) {
            return a.concat(b); // flatten
        });
        callback(err, vendor_product_ids);
    });
};

// options = { vendorId: 0, productId: 0 }
// callback = function (err, device)
module.exports = function (options, callback) {
    availableUSBDevices(function (err, hid_devices) {
        if (err)
            return console.log(err);
        var filtered_devices = hid_devices.filter(function (dev) {
            return (dev.vendorId === options.vendorId) && (dev.productId === options.productId);
        });
        if (device.length === 0) {
            callback(new Error('USB device not found'));
        } else {
            async.map(filtered_devices,
                function (dev, next) {
                    chrome.hid.connect(dev.deviceId, function (connection) {
                        next(null, new ChromeHAL(dev, connection));
                    });
                },
                callback);
        }
    });
};