/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ REQUIREMENTS ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

if (!window['dcodeIO'] || !window['dcodeIO']['ByteBuffer']) {
   var noByteBufferMsg = "The ByteBuffer library is required by this app.";
   console.log(noByteBufferMsg);
   throw new Error(noByteBufferMsg);
}

/* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ GLOBAL VARIABLES ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

//HearMe Variables 
var hearMeId;
var versionT;
var versionF;
var versionH;
var numPlaysTotal;
var numPlaysLast; 

var noneFound = false; 

var allPorts = [];
var currentPortIndex = 0;

//Timer
var connectionTimer; 
var hearMeTimer; 


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Sending Commands to HearMe ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
function str2buf(str){
	var newBuf = new dcodeIO.ByteBuffer(str.length); 
	newBuf.writeString(str, 0);
	return newBuf.toArrayBuffer();
}

function int8buf(num){
	var bb = new dcodeIO.ByteBuffer(1); 
	bb.writeInt8(num, 0); 
	return bb.toArrayBuffer(); 
}

function int32buf(num){
	var bb = new dcodeIO.ByteBuffer(4); 
	bb.BE(); 
	bb.writeInt32(num, 0); 
	return bb.toArrayBuffer(); 
}

function inputCommand(){
	for (var i = 0; i < arguments.length; i++){
		if (arguments[i] == "DISCONNECT"){
			clearTimeout(hearMeTimer); 
			chrome.serial.onReceive.removeListener(onReceiveCallback);
			chrome.serial.send(hearMeId, str2buf("R"), function(info){
				chrome.serial.disconnect(hearMeId, onDisconnect);
			});
			$('body').append('<div> HearMe Disconnected. </div>');
			return; 
		}
		chrome.serial.send(hearMeId, str2buf(arguments[i]), function(info){});
	}
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Connecting to HearMe ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~


var onDisconnect = function(result) {
  if (result) {
    console.log("Disconnected from the serial port");
  } else {
    console.log("Disconnect failed");
  }
}

function onReceiveCallback(info){
	console.log("onReceiveCallback");
	var byteBuffer = dcodeIO.ByteBuffer.wrap(info.data);
	console.log(byteBuffer.toDebug());
	var result = byteBuffer.readString(byteBuffer.capacity(),     // num characters to read
                              dcodeIO.ByteBuffer.METRICS_CHARS,
                              0);                                 // offset
	console.log(result.string);
	receivedHandler(result.string, info.connectionId);  
}

function onConnect(connectionInfo){
	try{
		if (chrome.runtime.lastError){
			throw new Error(chrome.runtime.lastError); 
		};

		chrome.serial.flush(connectionInfo.connectionId, function(){
			console.log("connectionId: " + connectionInfo.connectionId); 
			chrome.serial.onReceive.addListener(onReceiveCallback);
			connectionTimer = setTimeout(function() {
				console.log("I am connected to something that's not the device I want. Removing listener and disconnecting...");
				chrome.serial.onReceive.removeListener(onReceiveCallback);

				chrome.serial.disconnect(connectionInfo.connectionId, onDisconnect);
				console.log("...trying to connect to the next possible one.")
				connectWorkhorse();
			}, 751);
		}); 

	}catch(e){
		console.log("Unable to open port"); 
		connectWorkhorse();
	}; 
}

function connectWorkhorse() {
	if (currentPortIndex < allPorts.length){
		console.log("I am connectWorkhorse and will connect to ["+allPorts[currentPortIndex].path+"] currentPortIndex=" + currentPortIndex);
		chrome.serial.connect(allPorts[currentPortIndex].path, {bitrate: 115200}, onConnect);	
		currentPortIndex++;
	} else {
		$('body').append('<div>No devices found, searching again.</div>')
		console.log("No devices found, searching again.");
		console.log("*********************************")
		noneFound = true; 
		currentPortIndex = 0; 
		findHearMe(); 
	}
}

function findHearMe(){
	$('body').append('<div>Looking for HearMe... </div>'); 
	noneFound = false;
	chrome.serial.getDevices(function(ports){
		allPorts = ports;
		connectWorkhorse();
	}); 
}

function pingHearMe(){
	hearMeTimer = setTimeout(function() {
		console.log("PING!");
		chrome.serial.send(hearMeId, str2buf("P"), function(info){
			pingHearMe(); 
		})
	}, 25000);
}

function receivedHandler(str, connectionId){
	if (str.indexOf("HR") > -1){
		clearTimeout(connectionTimer); 
		hearMeId = connectionId;  
		inputCommand("ME", "T", "F", "H", "P"); 
		pingHearMe(); 
	}else if (str == "ME"){
		$('body').append('<div> Success! Choose files to upload: </div>');
		setTimeout(function() {
			chooseFiles();
		}, 3000);
		 
	}else if (str.substring(0, 1) == "T"){
		versionT = parseInt(str.substring(1)); 
		console.log("versionT: " + versionT); 
		$('body').append('<div>Transfer Protocol Version: ' + versionT + '</div>')
	}else if (str.substring(0, 1) == "F"){
		versionF = parseInt(str.substring(1));
		console.log("versionF: " + versionF);
		$('body').append('<div>Firmware Version: ' + versionF + '</div>')  
	}else if (str.substring(0, 1) == "H"){
		versionH = parseInt(str.substring(1)); 
		console.log("versionH: " + versionH);
		$('body').append('<div>Hardware Version: ' + versionH + '</div>')  
	}else if (str.substring(0, 1) == "P"){
		var vals = str.substring(1).split(","); 
		numPlaysTotal = vals[0]; 
		numPlaysLast = vals[1]; 
		console.log("numPlaysTotal: " + numPlaysTotal); 
		console.log("numPlaysLast: " + numPlaysLast); 
		$('body').append('<div>Total Number of Plays Ever: ' + numPlaysTotal +
						   '<br> Number of plays since last connect: ' + numPlaysLast + '</div>')  
	}
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Byte Processing ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var totalBytes; 
var dataTypeIndex = 0; 
var byteIndex = 0; 


function sendBytes(stories, storyLocation, storyLength, dataBufArray){
	clearTimeout(hearMeTimer);
	dataTypeIndex = 0
	byteIndex = 0
	totalBytes = [processHeader(stories, storyLocation, storyLength), processData(storyLocation, dataBufArray)]
	dataSendWorkHorse()
}

function dataSendWorkHorse(){
	if (dataTypeIndex < totalBytes.length){
		if (byteIndex < totalBytes[dataTypeIndex].length){
			chrome.serial.send(hearMeId, totalBytes[dataTypeIndex][byteIndex], function(info){
				if (info.error){
					console.log("Problem sending data, terminate!"); 
					return
				}
				console.log(byteIndex + " index packet sent.");
				console.log(info.bytesSent + " bytes sent."); 
				byteIndex++; 
				setTimeout(dataSendWorkHorse, 1);
				 
			}); 
		}else{
			console.log("Done sending data for one type.");
			dataTypeIndex++; 
			setTimeout(dataSendWorkHorse, 1);
		}
	}else{
		console.log("All Data is Sent."); 
		pingHearMe(); 
		// inputCommand("DISCONNECT");
		// clearTimeout(hearMeTimer);
	}
}

function processHeader(stories, storyLocation, storyLength){
	var bytesForI = []; 

	bytesForI.push(str2buf("I"), int8buf(stories.length)); 

	for (var i = 0; i < stories.length; i++){
		bytesForI.push(int32buf(storyLocation[i]));
		bytesForI.push(int32buf(storyLength[i]));
	}

	return bytesForI; 
}

function processData(storyLocation, dataBufArray){
	var bytesForD = [];

	for (var i = 0; i < dataBufArray.length; i++){
		var numPackets = dataBufArray[i].remaining()/256; 

		var currentDataLoc = storyLocation[i]; 
		var currentOffset = 0 

		for (var k = 0; k < numPackets; k++){
			var packetBuf = new dcodeIO.ByteBuffer(261); 
			
			packetBuf.writeString("D");

			packetBuf.BE(); 
			packetBuf.writeInt32(currentDataLoc);

			packetBuf.append(dataBufArray[i].slice(currentOffset, currentOffset + 256));

			packetBuf.offset = 0; 

			console.log(packetBuf.toDebug()); 
			bytesForD.push(packetBuf.toArrayBuffer());

			currentOffset += 256; 
			currentDataLoc += 256; 
		}

	}

	return bytesForD; 

}


function extractBytes(arrOfBuffs){
	//get wave files and get parameters to check each if number channels = 1, sample width = 2, and framerate = 16000; 
	//If any do not check out, remove from story list. 
	//calculate number of packets for each story, 

	$('body').append("<div>" + arrOfBuffs.length + " Files Selected.</div>");
	var dataBufArray = [];  
	var stories = arrOfBuffs; 

	var storyLocation = []; 
	var storyLength = []; 

	var errorFileFound = false; 
	var filesTooLong = false; 
	var tooManyStories = false; 

	var locSum = 0;
	var dataSum = 0;  

	for (var i = 0; i < arrOfBuffs.length; i++){

		arrOfBuffs[i].LE(); 

		var channels = arrOfBuffs[i].readInt16(22); 
		var sampleRate = arrOfBuffs[i].readInt32(24); 
		var sampleWidth = arrOfBuffs[i].readInt16(32);

		if (channels != 1 || sampleWidth != 2 || sampleRate != 16000){
			$('body').append("<div>Story [" + i + "] is incompatible with HearMe.</div>"); 
			errorFileFound = true; 
		}
		
		var dataSize = Math.ceil(arrOfBuffs[i].readInt32(40) / 4096) * 4096; 

		dataSum += dataSize + (dataSize/256)*5; 

		storyLength.push(dataSize);

		console.log(arrOfBuffs[i].offset, arrOfBuffs[i].limit);

		var dataBuf = new dcodeIO.ByteBuffer(dataSize); 

		dataBufArray.push(dataBuf.append(arrOfBuffs[i].slice(44), 0)); 

		storyLocation.push(locSum); 

		locSum += storyLength[i];

		console.log("Header Data for Story: " + i);
		console.log("channels: " + channels); 
		console.log("sampleWidth: " + sampleWidth);
		console.log("sampleRate: " + sampleRate); 
		console.log("dataSize: " + dataSize); 
		console.log("") 
	};

	if (versionH == 4){
		if (dataSum > 1048512) filesTooLong = true;
		if (stories.length > 10) tooManyStories = true; 
	}else if(versionH == 5){
		if (dataSum > 2097088) filesTooLong = true; 
		if (stories.length > 20) tooManyStories = true; 
	}

	if (errorFileFound){
			$('body').append("<div>Please reselect stories.</div>");
			setTimeout(chooseFiles, 3000);
			return;  
	}

	if (filesTooLong){
		$('body').append("<div>File sizes exceed capacity of HearMe. Please reselect stories.</div>");
			setTimeout(chooseFiles, 3000);
			return;  
	}

	if (tooManyStories){
		$('body').append("<div>Number of stories exceed capacity of HearMe. Please reselect stories.</div>");
			setTimeout(chooseFiles, 3000);
			return;  
	}

	console.log(storyLocation, storyLength);

	console.log("********************************************")

	sendBytes(stories, storyLocation, storyLength, dataBufArray); 

}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Receiving Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var fileIndex = 0;
var reader = new FileReader(); 
var arrOfBuffs = []; 

function convertToFiles(fileEntries){
	try{
		if (chrome.runtime.lastError){
				throw new Error(chrome.runtime.lastError); 
			};


		if (fileIndex < fileEntries.length){
			fileEntries[fileIndex].file(function success(file) {
	    							reader.readAsArrayBuffer(file);
						}, function fail(error) {
	    							alert("Unable to retrieve file properties: " + error.code);
						}); 
		}else{
			console.log("Done Processing Files");
			extractBytes(arrOfBuffs); 
		}

		reader.onload = function(e) {
	  			arrOfBuffs.push(dcodeIO.ByteBuffer.wrap(reader.result));
	  			console.log("Converted to File, Number: " + fileIndex);  
	  			fileIndex++; 
	  			convertToFiles(fileEntries);
			}
	}catch(e){
		console.log("No Files Chosen.");
		$('body').append("<div>No Files Chosen. Restart App until we find a better way to handle this. </div>");
		// setTimeout(chooseFiles, 3000);
	}
}

function chooseFiles(){
	fileIndex = 0;
	arrOfBuffs = []; 
	chrome.fileSystem.chooseEntry( {
      type: 'openFile',
      suggestedName: 'story_name.wav',
      accepts: [ { description: 'Wave Files (*.wav)',
                   extensions: ['wav']} ],
      acceptsMultiple: true
    }, convertToFiles);
}; 


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Initialize Page Processes ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~



findHearMe(); 
// chooseFiles(); 


chrome.runtime.onSuspend.addListener(function(){
	inputCommand("DISCONNECT"); 
})






