chrome.app.runtime.onLaunched.addListener(function() {
  chrome.app.window.create('index.html', {
    id: 'main',
    bounds: { width: 1000, height: 800},
    "resizable": false,
  }, function(win){
  	win.onClosed.addListener(function() {
    	inputCommand("DISCONNECT");
  	});
  });
});

