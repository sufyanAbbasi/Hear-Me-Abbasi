if (!window['dcodeIO'] || !window['dcodeIO']['ByteBuffer']) {
   var noByteBufferMsg = "The ByteBuffer library is required by this app.";
   console.log(noByteBufferMsg);
   throw new Error(noByteBufferMsg);
}

var BUFFER_SIZE = 20;

var byteBuffer = dcodeIO.ByteBuffer.allocate(BUFFER_SIZE);

byteBuffer.fill(0, 0);     // initialize to all zeros (TODO: not sure if this is necessary, but can't hurt)
byteBuffer.offset = 0;     // resets the write position

var hearMeID; 

function str2buf(str, byteBuffer){
	byteBuffer.flip(); 
	byteBuffer.writeString(str, 0);
	return byteBuffer.toArrayBuffer();
}



var onDisconnect = function(result) {
  if (result) {
    console.log("Disconnected from the serial port");
  } else {
    console.log("Disconnect failed");
  }
}

function onReceiveCallback(info){
	byteBuffer = dcodeIO.ByteBuffer.wrap(info.data);
	var result = byteBuffer.readString(2,                                  // num characters to read
                              dcodeIO.ByteBuffer.METRICS_CHARS,
                              0);                                 // offset
	console.log(result.string); 
	if (result.string.indexOf("HR") > -1 || result.string.indexOf("RH") > -1) {
		hearMeId = info.connectionId; 
		// chrome.serial.send(hearMeId, str2buf("ME", byteBuffer), function(info){
		// 	console.log(info.integer, info.error); 
		// });
	}//else{
	// 	chrome.serial.disconnect(info.connectionId, onDisconnect);
	// }
}

function onConnect(connectionInfo){
	if (!connectionInfo) {
    console.log('Could not open');
    return;
  }
	console.log("connectionId: " + connectionInfo.connectionId); 
	chrome.serial.onReceive.addListener(onReceiveCallback);
	//chrome.serial.disconnect(info.connectionId, onDisconnect);
}

function findHearMe(){
	chrome.serial.getDevices(function(ports){
		for (var i=0; i<ports.length; i++) {
			console.log("opening: " + ports[i].path)

			chrome.serial.connect(ports[i].path, {bitrate: 115200}, onConnect);
		
		}
	}); 
}

findHearMe(); 


