if (!window['dcodeIO'] || !window['dcodeIO']['ByteBuffer']) {
   var noByteBufferMsg = "The ByteBuffer library is required by this app.";
   console.log(noByteBufferMsg);
   throw new Error(noByteBufferMsg);
}

var BUFFER_SIZE = 20;

var byteBuffer = dcodeIO.ByteBuffer.allocate(BUFFER_SIZE);

// var hearMePath = ""; 


// function onReceiveCallback(info){
// 	console.log(info.data);
// }

// var onDisconnect = function(result) {
//   if (result) {
//     console.log("Disconnected from the serial port");
//   } else {
//     console.log("Disconnect failed");
//   }
// }

// function onConnect(connectionInfo){
// 	if (!connectionInfo) {
//     console.log('Could not open');
//     return;
//   }
// 	console.log("connectionID: " + connectionInfo.connectionId); 
// 	chrome.serial.onReceive.addListener(onReceiveCallback);
// 	setTimeout(function() {
// 		chrome.serial.disconnect(connectionInfo.connectionId, onDisconnect); 
// 	}, 1000);
	
// }


// function onGetDevices(ports){
// 	for (var i=0; i<ports.length; i++) {
// 		console.log("opening: " + ports[i].path)

// 		chrome.serial.connect(ports[i].path, {bitrate: 115200}, onConnect);
		
// 	}
	
// 	//chrome.serial.connect("/dev/cu.usbmodem1411", {bitrate: 115200}, onConnect);

// }

// chrome.serial.getDevices(onGetDevices);