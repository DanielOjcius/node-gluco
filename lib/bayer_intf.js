var async = require('async');

var nop = function () {};

var BayerInterface = function (usbdev) {
    var self = this;

    self.transfer_size = 64; // TODO get size (64) from usbdev

    self.write = function (data, callback) {
        var i = 0;
        async.whilst(function () {
            return i < data.length;
        }, function (next) {
            var buf = new Buffer(self.transfer_size);
            buf.fill(0);
            var data_part = new Buffer(data.slice(i, self.transfer_size - 4));
            data_part.copy(buf, 4); // skip 4 bytes: ABC + len
            buf[3] = data_part.length; // len
            i += data_part.length;
            usbdev.write(buf, function () {
                next();
            });
        }, callback || nop);
    };

    self.read = function (callback) {
        // TODO asyncify
        var frame = new Buffer(256); // max frame size (1 byte len)
        frame.fill(0);
        var pos = 0;
        var loop = function () {
            usbdev.read(function (err, data) {
                if (err)
                    return callback(err);
                else {
                    var len = data[3];
                    data.copy(frame, pos, 4, len + 4);
                    pos += len;
                    if (len === (self.transfer_size - 4))
                        setTimeout(loop, 0);
                    else
                        callback(null, frame.slice(0, pos));
                }
            });
        };
        loop();
    };

    return self;
};

module.exports = function (usbdev) {
    return new BayerInterface(usbdev);
};