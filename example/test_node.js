var gluco = require('..');
var util = require('util');
var request = require('request');
var yargs = require('yargs')
	.demand(['url', 'email'])
	.argv;


gluco({ vendorId: 0x1a79, productId: 0x7410 }, function (err, devices) {
	devices.forEach(function (dev) {
		dev.on('header', function (data) {
			console.error('[header]', util.inspect(data));
		});
		dev.on('result', function (data) {
			console.log(JSON.stringify(data));
			var match = data.testtime.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/);
			obj = {
				glucose: data.value,
				date: [match[3], match[2], match[1]].join('/'),
				time: [match[4], match[5], '0'].join(':'),
				email: yargs.email
			};
			request.post(yargs.url + '/users/' + email + '/data', obj);
		});
		dev.sync();
	});
});