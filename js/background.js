chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    id: 'main',
    innerBounds: { width: 700, height: 555 },
    "resizable": false,
  });
});

