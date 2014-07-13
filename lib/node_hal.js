var HID = require('node-hid');


module.exports = function (options, callback) {
	var hid_devices = HID.devices();
	var filtered_devices = hid_devices.filter(function (dev) {
		return (dev.vendorId === options.vendorId) && (dev.productId === options.productId);
	});
	if (filtered_devices.length === 0) {
		callback(new Error('USB device not found'));
	} else {
		callback(null, filtered_devices.map(function (dev) {
			var patch = new HID.HID(dev.path);
			var ow = patch.write;
			patch.write = function (data, cb) {
				ow(data);
				if (cb) cb();
			};
			return patch;
		}));
	}
};