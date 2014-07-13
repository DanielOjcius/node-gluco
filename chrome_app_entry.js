var gluco = require('./index');


window.addEventListener('load', function () {
	document.getElementById('scan').addEventListener('click', function () {

		gluco({ vendorId: 0x1a79, productId: 0x7410 }, function (err, devices) {
			devices.forEach(function (dev) {
				dev.on('data', function (data) {
					// console.log('data', JSON.stringify(data));
					document.getElementById('list').innerHtml += JSON.stringify(data);
				});
				dev.sync();
			});
		});

	});
});