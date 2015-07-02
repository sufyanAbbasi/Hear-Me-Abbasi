/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Requirements ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

if (!window['dcodeIO'] || !window['dcodeIO']['ByteBuffer']) {
   var noByteBufferMsg = "The ByteBuffer library is required by this app.";
   console.log(noByteBufferMsg);
   throw new Error(noByteBufferMsg);
}

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Global Variables ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

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

var sendingData = false; 

var StoriesList; 

//Timer
var searchTimer; 
var connectionTimer; 
var hearMeTimer; 

/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Load Screens ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

function loadTitle(){
	$('#top-bar li').css('opacity', '.5'); 
	$('#title-tab').css('opacity', '1');
	$('.arrow').css('transform', 'translateX(70px)');
	$('#main-content').empty(); 
	$('#main-content').load('ajax/../html_modules/title.html', findHearMe); 
}

function loadChooseFiles(){
	$('#top-bar li').css('opacity', '.5'); 
	$('#files-tab').css('opacity', '1');
	$('.arrow').css('transform', 'translateX(243px)');
	$('#main-content').empty(); 
	$('#main-content').load('ajax/../html_modules/choose_file.html', function(){
		$('#file-list button').on('click', function(){
			chooseFiles(); 
		})
	});
}

function loadUpload(){
	$('#top-bar li').css('opacity', '.5'); 
	$('#upload-tab').css('opacity', '1');
	$('.arrow').css('transform', 'translateX(420px)');
	$('#main-content').load('ajax/../html_modules/upload.html', function(){
		sendBytes();
	});
}

function loadComplete(){
	$('#top-bar li').css('opacity', '.5'); 
	$('#complete-tab').css('opacity', '1');
	$('.arrow').css('transform', 'translateX(594px)');
	$('#main-content').empty(); 
	$('#main-content').load('ajax/../html_modules/complete.html', function(){

		$('#first').hover(function(){
			$('#first').css('opacity', .75);
		}, function(){
			$('#first').css('opacity', .45);
		}).bind('click', function(){
			loadChooseFiles();
		});

		$('#second').hover(function(){
			$('#second').css('opacity', .75);
		}, function(){
			$('#second').css('opacity', .45);
		}).bind('click', function(){
			$('#first').unbind().css('opacity', .25); 
			$('#second p').replaceWith("<p>Unplug and<br>Connect Another<p>");
			$('#second').unbind();
		});
	});
}

function loadError(){
	$('#top-bar li').css('opacity', '.5'); 
	$('#top-bar li').css('opacity', '.5');
	$('.arrow').css('transform', 'translateX(340px)');
	$('#main-content').empty();
	$('#main-content').load('ajax/../html_modules/error.html', function(){
		clearTimeout(hearMeTimer);
		setTimeout(function() {
			loadTitle();
		}, 3000);
	});   
}	


/*~~~~~~~~~~~~~~~~~~~~~~~ Sending Commands to HearME ~~~~~~~~~~~~~~~~~~~~~~~~*/
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
			// $('body').append('<div> HearMe Disconnected. </div>');
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
	var byteBuffer = dcodeIO.ByteBuffer.wrap(info.data);
	var result = byteBuffer.readString(byteBuffer.capacity(),     // num characters to read
                              dcodeIO.ByteBuffer.METRICS_CHARS,
                              0);                                 // offset
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
				chrome.serial.onReceive.removeListener(onReceiveCallback);

				chrome.serial.disconnect(connectionInfo.connectionId, onDisconnect);
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
		chrome.serial.connect(allPorts[currentPortIndex].path, {bitrate: 115200}, onConnect);	
		currentPortIndex++;
	} else {
		// $('body').append('<div>No devices found, searching again. Wait 30 seconds for HearMe time out, or check connection.</div>')
		console.log("No devices found, searching again.");
		console.log("*********************************")
		searchTimer = setTimeout(function() {
			$('#title #looking').text('This may take a while. Please check that HearMe is plugged in and not connected to any other applications.');
		}, 30000);
		noneFound = true; 
		currentPortIndex = 0; 
		findHearMe(); 
	}
}

function findHearMe(){
	clearTimeout(searchTimer); 
	hearMeId = null; 
	noneFound = false;
	chrome.serial.getDevices(function(ports){
		allPorts = ports;
		connectWorkhorse();
	}); 
}

function pingHearMe(){
	hearMeTimer = setTimeout(function() {
		console.log("PING!");
		if (!sendingData){
			chrome.serial.send(hearMeId, str2buf("P"), function(info){
			if (!chrome.runtime.lastError){
				if (info.error){
				loadError();
				return;
			}	
				pingHearMe(); 
			}
		})
		}
	}, 2000);
}

function receivedHandler(str, connectionId){
	if (str.indexOf("HR") > -1){
		clearTimeout(connectionTimer); 
		hearMeId = connectionId;  
		inputCommand("ME", "T", "F", "H", "P"); 
		pingHearMe(); 
	}else if (str == "ME"){
		// $('body').append('<div> Success! Choose files to upload: </div>');
		clearTimeout(searchTimer);
		$('#search').replaceWith('<p style="padding-top: 50px;">Success!<p>');
		setTimeout(function() {
			loadChooseFiles(); 
		}, 2000);
		 
	}else if (str.substring(0, 1) == "T"){
		versionT = parseInt(str.substring(1)); 
		console.log("versionT: " + versionT); 
		// $('body').append('<div>Transfer Protocol Version: ' + versionT + '</div>')
	}else if (str.substring(0, 1) == "F"){
		versionF = parseInt(str.substring(1));
		console.log("versionF: " + versionF);
		// $('body').append('<div>Firmware Version: ' + versionF + '</div>')  
	}else if (str.substring(0, 1) == "H"){
		versionH = parseInt(str.substring(1)); 
		console.log("versionH: " + versionH);
		// $('body').append('<div>Hardware Version: ' + versionH + '</div>')  
	}else if (str.substring(0, 1) == "P"){
		var vals = str.substring(1).split(","); 
		numPlaysTotal = vals[0]; 
		numPlaysLast = vals[1]; 
		console.log("numPlaysTotal: " + numPlaysTotal); 
		console.log("numPlaysLast: " + numPlaysLast); 
		// $('body').append('<div>Total Number of Plays Ever: ' + numPlaysTotal +
						   // '<br> Number of plays since last connect: ' + numPlaysLast + '</div>')  
	}
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Byte Processing ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var totalBytes; 
var totalNumBytes = 0;
var progressByte = 0; 
var dataTypeIndex = 0; 
var byteIndex = 0; 


function sendBytes(){
	dataTypeIndex = 0
	progressByte = 0; 
	byteIndex = 0
	totalBytes = [processHeader(), processData()]
	totalNumBytes = totalBytes[0].length + totalBytes[1].length; 
	console.log("total number of bytes to send: " + totalNumBytes);
	clearTimeout(hearMeTimer);
	sendingData = true; 
	setTimeout(dataSendWorkHorse, 2000)
}

function dataSendWorkHorse(){
	if (dataTypeIndex < totalBytes.length){
		if (byteIndex < totalBytes[dataTypeIndex].length){
			chrome.serial.send(hearMeId, totalBytes[dataTypeIndex][byteIndex], function(info){
				if (info.error){
					console.log("Problem sending data, terminate!"); 
					inputCommand("DISCONNECT");
					loadError();
					return
				}
				byteIndex++;
				progressByte++;
				console.log(byteIndex, progressByte);
				$('.bar').css('transform', 'translateX('+ (-100 + (100*progressByte/totalNumBytes)) + '%)'); 
				$('.log p').text(Math.round((100*progressByte/totalNumBytes)) + '%'); 
				setTimeout(dataSendWorkHorse, 5); 
			}); 
		}else{
			console.log("Done sending data for one type.");
			byteIndex = 0; 
			dataTypeIndex++; 
			setTimeout(dataSendWorkHorse, 5);
		}
	}else{
		console.log("All Data is Sent."); 
		$('.log p').text('Complete.'); 
		sendingData = false;
		setTimeout(function() {
			pingHearMe();
			loadComplete();
		}, 3500);

		// inputCommand("DISCONNECT");
		// clearTimeout(hearMeTimer);
	}
}

function processHeader(){
	var bytesForI = []; 

	bytesForI.push(str2buf("I"), int8buf(StoriesList.length)); 

	for (var i = 0; i < StoriesList.length; i++){
		bytesForI.push(int32buf(StoriesList[i].location));
		bytesForI.push(int32buf(StoriesList[i].length));
	}

	return bytesForI; 
}

function processData(){
	var bytesForD = [];

	for (var i = 0; i < StoriesList.length; i++){
		var numPackets = StoriesList[i].dataBytes.remaining()/256; 

		var currentDataLoc = StoriesList[i].location; 
		var currentOffset = 0 

		for (var k = 0; k < numPackets; k++){
			var packetBuf = new dcodeIO.ByteBuffer(261); 
			
			packetBuf.writeString("D");

			packetBuf.BE(); 
			packetBuf.writeInt32(currentDataLoc);

			packetBuf.append(StoriesList[i].dataBytes.slice(currentOffset, currentOffset + 256));

			packetBuf.offset = 0; 

			bytesForD.push(packetBuf.toArrayBuffer());

			currentOffset += 256; 
			currentDataLoc += 256; 
		}

	}

	return bytesForD; 

}

function Story(name, location, length, dataBytes, valid){
	this.name = name; 
	this.location = location; 
	this.length = length; 
	this.dataBytes = dataBytes; 
	this.valid = valid; 
}

function processStories(){
	var li = $('#file-list ul').children().filter('li');
	
	li.children().css("background-color", "transparent");

	var numErrorFiles = 0; 
	var filesTooLong = false; 
	var tooManyStories = false; 

	var maxNumStories = 10; 

	var locSum = 0;
	var dataSum = 0; 

	for (var i = 0; i < StoriesList.length; i++){
		if (!StoriesList[i].valid){
			numErrorFiles++;
			li.eq(i).children().css({
								"background-color": "red", 
								"opacity": ".6", 
							}); 
		}else{
			li.eq(i).children().css({
								"background-color": "green", 
								"opacity": ".6", 
							});
		}

		dataSum += StoriesList[i].length + (StoriesList[i].length/256)*5; 

		StoriesList[i].location = locSum; 

		locSum += StoriesList[i].length;

	}

	if (numErrorFiles){
		if (numErrorFiles > 1){
			$('#message-box p').text(numErrorFiles + ' files of ' + StoriesList.length + ' are incompatible with HearMe. Please reselect files.');
		}else{
			$('#message-box p').text(numErrorFiles + ' file of ' + StoriesList.length + ' is incompatible with HearMe. Please reselect files.');
		}
		return 
	}

	if (versionH == 4){
		if (dataSum > 1048512) filesTooLong = true;
		if (StoriesList.length > 10) tooManyStories = true; 
	}else if(versionH == 5){
		if (dataSum > 2097088) filesTooLong = true; 
		if (StoriesList.length > 20) tooManyStories = true; 
		maxNumStories == 20;
	}

	if (filesTooLong){
		$('#message-box p').replaceWith('<p style="margin-top: 25px;">Total file size is larger than the capacity of the HearMe. Please reselect less files.</p>'); 
		return;  
	}

	if (tooManyStories){
		$('#message-box p').replaceWith('<p style="margin-top: 25px;">Total number of stories exceed capacity of HearMe. Please reselect ' + maxNumStories +' or less files.</p>');
		return;  
	}

	if (StoriesList.length == 1){
		$('#message-box p').replaceWith('<p style="margin-top: 35px;">' + StoriesList.length + ' story is ready to be uploaded. You may reselect files if you want.</p>');
	}else{
		$('#message-box p').replaceWith('<p style="margin-top: 35px;">' + StoriesList.length + ' stories are ready to be uploaded. You may reselect files if you want.</p>');
	}

	$('#upload-button button').on('click', function(){
		
		$('#upload-button button').attr('disabled','disabled');
		
		setTimeout(function() {
			loadUpload(); 
		}, 1000);
	});

	$('#upload-button button').removeAttr('disabled');
}


function extractBytes(arrOfBuffs){
	//get wave files and get parameters to check each if number channels = 1, sample width = 2, and framerate = 16000; 
	//If any do not check out, remove from story list. 
	//calculate number of packets for each story, 

	// $('body').append("<div>" + arrOfBuffs.length + " Files Selected.</div>");

	// var li = $('#file-list ul').children().filter('li');
	
	// li.children().css("background-color", "transparent");

	// var dataBufArray = [];  
	// var stories = arrOfBuffs; 

	// var storyLocation = []; 
	// var storyLength = []; 

	// var numErrorFiles = 0; 
	// var filesTooLong = false; 
	// var tooManyStories = false; 

	// var maxNumStories = 10; 

	// var locSum = 0;
	// var dataSum = 0;  

	StoriesList = [];

	for (var i = 0; i < arrOfBuffs.length; i++){
		var currentStory = new Story(0, 0, 0, null, null); 

		arrOfBuffs[i].LE(); 

		var channels = arrOfBuffs[i].readInt16(22); 
		var sampleRate = arrOfBuffs[i].readInt32(24); 
		var sampleWidth = arrOfBuffs[i].readInt16(32);

		if (channels != 1 || sampleWidth != 2 || sampleRate != 16000){
			currentStory.valid = false; 
			// li.eq(i).children().css({
			// 						"background-color": "red", 
			// 						"opacity": ".6", 
			// 					});
			// 	errorFileFound = true; 
			// 	numErrorFiles++; 
		}else{
			currentStory.valid = true; 
			// li.eq(i).children().css({
			// 					"background-color": "green", 
			// 					"opacity": ".6", 
			// 				});
		}
		
		var dataSize = Math.ceil(arrOfBuffs[i].readInt32(40) / 4096) * 4096; 

		currentStory.length = dataSize; 

		// //dataSum is the dataSize + 5 bytes for every 256 byte packet 
		// dataSum += dataSize + (dataSize/256)*5; 

		// storyLength.push(dataSize);

		var dataBuf = new dcodeIO.ByteBuffer(dataSize); 

		// dataBufArray.push(dataBuf.append(arrOfBuffs[i].slice(44), 0)); 

		currentStory.dataBytes = dataBuf.append(arrOfBuffs[i].slice(44), 0); 

		// storyLocation.push(locSum); 

		// locSum += storyLength[i];

		StoriesList.push(currentStory);

		console.log("Header Data for Story: " + i);
		console.log("channels: " + channels); 
		console.log("sampleWidth: " + sampleWidth);
		console.log("sampleRate: " + sampleRate); 
		console.log("dataSize: " + dataSize); 
		console.log("") 
	};

	// if (numErrorFiles){
	// 	if (numErrorFiles > 1){
	// 		$('#message-box p').text(numErrorFiles + ' files of ' + stories.length + ' are incompatible with HearMe. Please reselect files.');
	// 	}else{
	// 		$('#message-box p').text(numErrorFiles + ' file of ' + stories.length + ' is incompatible with HearMe. Please reselect files.');
	// 	}
	// 	return 
	// }

	// if (versionH == 4){
	// 	if (dataSum > 1048512) filesTooLong = true;
	// 	if (stories.length > 10) tooManyStories = true; 
	// }else if(versionH == 5){
	// 	if (dataSum > 2097088) filesTooLong = true; 
	// 	if (stories.length > 20) tooManyStories = true; 
	// 	maxNumStories == 20;
	// }

	// if (filesTooLong){
	// 	$('#message-box p').replaceWith('<p style="margin-top: 25px;">Total file size is larger than the capacity of the HearMe. Please reselect less files.</p>'); 
	// 	return;  
	// }

	// if (tooManyStories){
	// 	$('#message-box p').replaceWith('<p style="margin-top: 25px;">Total number of stories exceed capacity of HearMe. Please reselect ' + maxNumStories +' or less files.</p>');
	// 	return;  
	// }

	// if (stories.length == 1){
	// 	$('#message-box p').replaceWith('<p style="margin-top: 35px;">' + stories.length + ' story is ready to be uploaded. You may reselect files if you want.</p>');
	// }else{
	// 	$('#message-box p').replaceWith('<p style="margin-top: 35px;">' + stories.length + ' stories are ready to be uploaded. You may reselect files if you want.</p>');
	// }

	// console.log("********************************************")

	// $('#upload-button button').on('click', function(){
		
	// 	$('#upload-button button').attr('disabled','disabled');
		
	// 	setTimeout(function() {
	// 		loadUpload(stories, storyLocation, storyLength, dataBufArray); 
	// 	}, 1000);
	// });

	// $('#upload-button button').removeAttr('disabled');

	processStories(); 

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

		$('#message-box p').text('Processing files...');

		var li = $('#file-list ul').children().filter('li');



		if (fileIndex < fileEntries.length){
			li.eq(fileIndex).append(fileEntries[fileIndex].name);

			fileEntries[fileIndex].file(function success(file) {
	    							reader.readAsArrayBuffer(file);
						}, function fail(error) {
	    							alert("Unable to retrieve file properties: " + error.code);
						}); 
		}else{
			$('#message-box p').text('Verifying file compatibility...');
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
		$('#message-box p').text('No files chosen. Please press the "choose files" button.');
		var li = $('#file-list ul').children().filter('li');
		li.children().css("background-color", "transparent");
	}
}

function chooseFiles(){
	$('#upload-button button').attr('disabled','disabled');
	var li = $('#file-list ul').children().filter('li');
	li.contents().filter(function(){
    	return (this.nodeType == 3);
	}).remove();
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

loadTitle(); 

// loadChooseFiles();

chrome.runtime.onSuspend.addListener(function(){
	console.log("cleanup");
	inputCommand("DISCONNECT"); 
})







