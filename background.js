chrome.app.runtime.onLaunched.addListener(function() {
    chrome.app.window.create('window.html', {
        id: "MainWindow",
        innerBounds: {
            width: 640,
            height: 480
        }
    });
});