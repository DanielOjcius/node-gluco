var EventEmitter = require('events').EventEmitter;
var util = require('util');
var async = require('async');


var field_sep = '|';
var repeat_sep = '\\';
var comp_sep = '^';
var escape_sep = '&';

var referenceMap = {
    'B': 'whole blood',
    'P': 'plasma',
    'C': 'capillary',
    'D': 'deproteinized whole blood'
};

var bayerContourRecord = function (data, ee) {
    var rec_type = data[0];
    switch (rec_type) {
    case 'H':
        var obj =  {
            field_sep: data[1],
            repeat_sep: data[2],
            comp_sep: data[3],
            escape_sep: data[4]
        };
        field_sep = obj.field_sep;
        repeat_sep =obj.repeat_sep;
        comp_sep = obj.comp_sep;
        escape_sep = obj.escape_sep;
        var fields = data.slice(6).split(field_sep);
        obj.password = fields[1];
        obj.meta = fields[2].split(comp_sep);
        obj.version = obj.meta[1].split(repeat_sep);
        obj.device_info = {};
        fields[3].split(comp_sep).forEach(function (item) { 
            var t = item.split('=');
            obj.device_info[t[0]] = t[1];
        });
        // self.device_info.G = self.device_info.G.split(',').map(function (item) { return item.split(self.repeat_sep); } );
        obj.result_count = fields[4];
        obj.processing_id = fields[9];
        obj.spec_version = fields[10];
        obj.header_datetime = fields[11];
        ee.emit('header', obj);
        break;
    case 'P':
        ee.emit('info', {
            patient_info: data.split(field_sep)[1]
        });
        break;
    case 'O':
        // TODO test order
        ee.emit('order');
        break;
    case 'R':
        fields = data.split(field_sep);
        var sp4 = fields[4].split(comp_sep);
        obj = {
            recno: fields[1],
            meastype: fields[2].split(comp_sep)[3],
            value: fields[3],
            unit: sp4[0],
            method: referenceMap[sp4[1]],
            // TODO resultflags
            testtime: fields[8]
        };
        ee.emit('result', obj);
        break;
    case 'L':
        if (data.split(field_sep)[3] === 'N')
            ee.emit('end');
        break;
    default:
        ee.emit('error', new Error('unknown record type'));
        break;
    }
};


var BayerProtocolStates = {
    ESTABLISH: 1,
    DATA: 2,
    PRECOMMAND: 3,
    COMMAND: 4
};

var ASCII = {
    ACK: 0x6,
    ENQ: 0x5,
    EOT: 0x4,
    ETB: 0x17,
    ETX: 0x3,
    NAK: 0x15,
    STX: 0x2,
    LF: 0x0A,
    CR: 0x0D
};

var indexOf = function (buf, needle) {
    for (var i = 0; i < buf.length; i++) {
        if (buf[i] === needle)
            return i;
    }
    return -1;
};

var BayerProtocol = function (intf) {
    var self = this;
    EventEmitter.call(self);

    var state = BayerProtocolStates.ESTABLISH;

    var FRAME_RE = /\x02([0-7])([^\x0d]*)\x0d([\x03\x17])([0-9A-F][0-9A-F])\x0d\x0a/;

    var decodeFrame = function (frame) {
        var match = FRAME_RE.exec(frame);
        if (!match)
            return console.log('no match');
        // console.log(match[3] == ASCII.ETX ? 'ETX' : 'ETB');
        // TODO checksum
        return match[2];
    };

    self.sync = function (callback) {
        var stop = false;
        var cmd = [ASCII.EOT];
        var foo = 0;
        async.whilst(function () {
                return !stop;
            },
            function (next) {
                intf.write(cmd);
                intf.read(function (err, frame) {
                    var last_ch = frame[frame.length - 1];
                    // console.log('last_ch', last_ch);
                    if (state === BayerProtocolStates.ESTABLISH) {
                        switch (last_ch) {
                        case ASCII.NAK:
                            foo = (foo + 1) % 256;
                            cmd = [foo];
                            return next();
                        case ASCII.ENQ:
                            cmd = [ASCII.ACK];
                            return next();
                        }
                    }
                    if (state === BayerProtocolStates.DATA) {
                        if (last_ch == ASCII.EOT) {
                            stop = true;
                            state = BayerProtocolStates.PRECOMMAND;
                            return next();
                        } /*else if (last_ch === ASCII.LF) {
                            cmd = [ASCII.ACK];
                            return next();
                        }*/
                    }
                    var stx = indexOf(frame, ASCII.STX);
                    if (stx === -1) {
                        self.emit('no stx', frame);
                        cmd = [ASCII.NAK];
                    } else {
                        bayerContourRecord(decodeFrame(frame.slice(stx)), self);
                        cmd = [ASCII.ACK];
                        state = BayerProtocolStates.DATA;
                    }
                    next();
                });
            },
            callback);
    };

    return self;
};

util.inherits(BayerProtocol, EventEmitter);

module.exports = function (intf) {
    return new BayerProtocol(intf);
};