var gluco = require('..');


gluco({ vendorId: 0x1a79, productId: 0x7410 }, function (err, devices) {
	devices.forEach(function (dev) {
		dev.on('data', function (data) {
			console.log(JSON.stringify(data));
		});
		dev.sync();
	});
});