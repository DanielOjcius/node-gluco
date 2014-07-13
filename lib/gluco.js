var hal = (typeof module !== 'undefined' && module.exports) ? require('./node_hal') : require('./chrome_hal');

var findInterface = function (vendorId) {
	switch (vendorId) {
	default:
	case 0x1a79:
		return require('./bayer_intf');
	}
};

var findProtocol = function (productId) {
	switch (productId) {
	default:
	case 0x7410:
		return require('./bayer_contour');
	}
};

module.exports = function (options, callback) {
    hal(options, function (err, devices) {
    	if (err)
    		return callback(err);
    	var glucoDevices = devices.map(function (device) {
	    	var intf = findInterface(options.vendorId);
	    	var proto = findProtocol(options.productId);
	    	return proto(intf(device));
    	});
    	callback(null, glucoDevices);
    });
};