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

var allPorts = [];
var currentPortIndex = 0;

var sendingData = false; 

var StoriesList = []; 

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
		processStories();
		$('#hearme-info').append('<p>Total Number Of Plays: ' + numPlaysTotal +'</p>').append('<p>Since Last Upload: ' + numPlaysLast + '</p>');
		$('#file-list button').on('click', function(){
			chooseFiles(); 
		})
		$('.list-container').on('click', '.x-button', function(){
			var index = $('.list-container li').index($(this).parent()); 
			StoriesList.splice(index, 1); 
			processStories();
		})

		$('#upload-button button').on('click', function(){
		
			$('#upload-button button').attr('disabled','disabled');
			
			setTimeout(function() {
				loadUpload(); 
			}, 1000);
		});
	});
}

function loadUpload(){
	$('#top-bar li').css('opacity', '.5'); 
	$('#upload-tab').css('opacity', '1');
	$('.arrow').css('transform', 'translateX(420px)');
	$('#main-content').empty();
	$('#main-content').load('ajax/../html_modules/upload.html', function(){
		sendBytes();
	});
}

function loadComplete(){
	sendingData = false;
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
		inputCommand("DISCONNECT"); 
		clearInterval(hearMeTimer);
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
	try{
		if (chrome.runtime.lastError){
			console.log("No HearMe Connected.");
			return;
		}

		for (var i = 0; i < arguments.length; i++){
			if (arguments[i] == "DISCONNECT"){
				chrome.serial.onReceive.removeListener(onReceiveCallback);
				chrome.serial.send(hearMeId, str2buf("R"), function(info){
					chrome.serial.disconnect(hearMeId, onDisconnect);
				});
				return; 
			}
			if (arguments[i] == "CLOSE"){
				chrome.serial.onReceive.removeListener(onReceiveCallback);
				chrome.serial.send(hearMeId, str2buf("R"), function(info){
					chrome.serial.disconnect(hearMeId, function(){
						chrome.app.window.current().close();
					});
				});
				return; 
			}
			chrome.serial.send(hearMeId, str2buf(arguments[i]), function(info){});
		}
	}catch(e){
		console.log(e); 
	}
	
}

function closeApp(){
	if(hearMeId){
		inputCommand("CLOSE");  

	}else{
		chrome.app.window.current().close();
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
		console.log("No devices found, searching again.");
		console.log("*********************************")
		searchTimer = setTimeout(function() {
			$('#title #looking').text('This may take a while. Please check that HearMe is plugged in and not connected to any other applications.');
		}, 30000);
		currentPortIndex = 0; 
		findHearMe(); 
	}
}

function findHearMe(){
	hearMeId = null; 
	chrome.serial.getDevices(function(ports){
		allPorts = ports;
		connectWorkhorse();
	}); 
}

function pingHearMe(){
	hearMeTimer = setInterval(function() {
		if (!sendingData){
			chrome.serial.send(hearMeId, str2buf("P"), function(info){
			if (!chrome.runtime.lastError){
				if (info.error){
					loadError();
					return;
				}	
			}});
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
		clearTimeout(searchTimer);
		$('#search').replaceWith('<p style="padding-top: 50px;">Success!<p>');
		setTimeout(function() {
			loadChooseFiles(); 
		}, 2000);
		 
	}else if (str.substring(0, 1) == "T"){
		versionT = parseInt(str.substring(1)); 
		console.log("versionT: " + versionT); 
	}else if (str.substring(0, 1) == "F"){
		versionF = parseInt(str.substring(1));
		console.log("versionF: " + versionF);
	}else if (str.substring(0, 1) == "H"){
		versionH = parseInt(str.substring(1)); 
		console.log("versionH: " + versionH);
	}else if (str.substring(0, 1) == "P"){
		var vals = str.substring(1).split(","); 
		numPlaysTotal = vals[0]; 
		numPlaysLast = vals[1]; 
		// console.log("numPlaysTotal: " + numPlaysTotal); 
		// console.log("numPlaysLast: " + numPlaysLast); 
						   // '<br> Number of plays since last connect: ' + numPlaysLast + '</div>')  
	}
}


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Byte Processing and Sending ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var totalBytes; 
var totalNumBytes = 0;
var progressByte = 0; 
var dataTypeIndex = 0; 
var byteIndex = 0; 


function sendBytes(){
	totalBytes = []; 
	totalNumBytes = 0;
	progressByte = 0; 
	dataTypeIndex = 0; 
	byteIndex = 0; 
	totalBytes = [processHeader(), processData()];
	totalNumBytes = totalBytes[0].length + totalBytes[1].length; 
	console.log("total number of bytes to send: " + totalNumBytes);
	sendingData = true;
	setTimeout(dataSendWorkHorse, 2000)
}

function dataSendWorkHorse(){
	if (dataTypeIndex < totalBytes.length){
		if (byteIndex < totalBytes[dataTypeIndex].length){
			chrome.serial.send(hearMeId, totalBytes[dataTypeIndex][byteIndex], function(info){
				if (chrome.runtime.lastError){
					if (info.error){
						console.log(info.error);
						console.log("Problem sending data, terminate!"); 
						inputCommand("DISCONNECT");
						loadError();
						return
					}
				}
				
				byteIndex++;
				progressByte++;
				$('.bar').css('transform', 'translateX('+ (-100 + (100*progressByte/totalNumBytes)) + '%)'); 
				$('.log p').text(Math.round((100*progressByte/totalNumBytes)) + '%'); 
				setTimeout(dataSendWorkHorse, 10); 
			}); 
		}else{
			console.log("Done sending data for one type.");
			byteIndex = 0; 
			dataTypeIndex++; 
			setTimeout(dataSendWorkHorse, 10);
		}
	}else{
		console.log("All Data is Sent."); 
		$('.log p').text('Complete.'); 
		setTimeout(function() {
			loadComplete();
		}, 3500);
	}
}

function processHeader(){
	var bytesForI = []; 

	bytesForI.push(str2buf("I"), int8buf(StoriesList.length)); 

	for (var i = 0; i < StoriesList.length; i++){
		console.log(StoriesList[i].location, StoriesList[i].length);
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

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Story Processing ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~



function Story(name, location, length, dataBytes, valid){
	this.name = name; 
	this.location = location; 
	this.length = length; 
	this.dataBytes = dataBytes; 
	this.valid = valid; 
}

function processStories(){
	$('#upload-button button').attr('disabled','disabled');

	var li = $('#file-list ul').children().filter('li');

	li.contents().filter(function(){
    	return (this.nodeType == 3);
	}).remove();
	
	li.children().filter('.validation').css("background-color", "transparent");

	li.children().filter(':not(.validation)').remove();

	var numErrorFiles = 0; 
	var filesTooLong = false; 
	var tooManyStories = false; 

	var maxNumStories = 10; 

	var locSum = 0;
	var dataSum = 0; 

	if (StoriesList.length == 0) {
		$('#file-info p').text('No files chosen. Please press the "choose files" button.');
		return;
	}

	for (var i = 0; i < StoriesList.length; i++){
		if (i >= 20){
			$('.list-container ul').append('<li><div class="validation"></div></li><hr>')
			li = $('#file-list ul').children().filter('li');
		}

		storyName = StoriesList[i].name.split('.wav')[0]; 

		if (storyName.length >= 18){
			storyName = storyName.substring(0, 16);
			li.eq(i).attr('title', StoriesList[i].name).append(storyName + "...wav").prepend('<div class="x-button"><p>&#10006</p></div><div class="spacer"><div>'); 
		}else{
			li.eq(i).append(StoriesList[i].name).prepend('<div class="x-button"><p>&#10006</p></div><div class="spacer"><div>');
		}

		
		if (!StoriesList[i].valid){
			numErrorFiles++;
			li.eq(i).children().filter('.validation').css({
								"background-color": "red", 
								"opacity": ".6", 
							}); 
		}else{
			li.eq(i).children().filter('.validation').css({
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
			$('#file-info p').text(numErrorFiles + ' files of ' + StoriesList.length + ' are incompatible with HearMe. Please remove bad files.');
		}else{
			$('#file-info p').text(numErrorFiles + ' file of ' + StoriesList.length + ' is incompatible with HearMe. Please remove bad file.');
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
		$('#file-info p').replaceWith('<p style="margin-top: 25px;">Total file size is larger than the capacity of the HearMe. Please remove some files.</p>'); 
		return;  
	}

	if (tooManyStories){
		$('#file-info p').replaceWith('<p style="margin-top: 25px;">Total number of stories exceed capacity of HearMe. Please reselect ' + maxNumStories +' or less files.</p>');
		return;  
	}

	if (StoriesList.length == 1){
		$('#file-info p').replaceWith('<p style="margin-top: 35px;">' + StoriesList.length + ' story is ready to be uploaded. You may reselect files if you want.</p>');
	}else{
		$('#file-info p').replaceWith('<p style="margin-top: 35px;">' + StoriesList.length + ' stories are ready to be uploaded. You may reselect files if you want.</p>');
	}

	$('#upload-button button').removeAttr('disabled');
}


function extractBytes(arrOfBuffs, names){
	// StoriesList = [];

	for (var i = 0; i < arrOfBuffs.length; i++){
		var currentStory = new Story(0, 0, 0, null, null); 

		currentStory.name = names[i];

		arrOfBuffs[i].LE(); 

		var channels = arrOfBuffs[i].readInt16(22); 
		var sampleRate = arrOfBuffs[i].readInt32(24); 
		var sampleWidth = arrOfBuffs[i].readInt16(32);

		if (channels != 1 || sampleWidth != 2 || sampleRate != 16000){
			currentStory.valid = false; 
		}else{
			currentStory.valid = true; 
		}
		
		var dataSize = Math.ceil(arrOfBuffs[i].readInt32(40) / 4096) * 4096; 

		currentStory.length = dataSize; 

		var dataBuf = new dcodeIO.ByteBuffer(dataSize); 

		currentStory.dataBytes = dataBuf.append(arrOfBuffs[i].slice(44), 0); 

		StoriesList.push(currentStory);

		console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')

		console.log("Header Data for Story: " + i);
		console.log("channels: " + channels); 
		console.log("sampleWidth: " + sampleWidth);
		console.log("sampleRate: " + sampleRate); 
		console.log("dataSize: " + dataSize); 
		console.log("") 
	};

	processStories(); 

}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Receiving Files ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var fileIndex = 0;
var reader = new FileReader(); 
var arrOfBuffs = [];
var names = [];  

function convertToFiles(fileEntries){
	try{
		if (chrome.runtime.lastError){
				throw new Error(chrome.runtime.lastError); 
			};

		$('#file-info p').text('Processing files...');

		if (fileIndex < fileEntries.length){ 

			fileEntries[fileIndex].file(function success(file) {
	    							reader.readAsArrayBuffer(file);
						}, function fail(error) {
	    							alert("Unable to retrieve file properties: " + error.code);
						}); 
		}else{
			$('#file-info p').text('Verifying file compatibility...');
			console.log("Done Processing Files");
			extractBytes(arrOfBuffs, names); 
		}

		reader.onload = function(e) {
	  			arrOfBuffs.push(dcodeIO.ByteBuffer.wrap(reader.result));
	  			names.push(fileEntries[fileIndex].name);
	  			console.log("Converted to File, Number: " + fileIndex);  
	  			fileIndex++; 
	  			convertToFiles(fileEntries);
			}
	}catch(e){
		console.log("No Files Chosen.");
		console.log(e);
	}
}

function chooseFiles(){
	fileIndex = 0;
	reader = new FileReader(); 
	arrOfBuffs = [];
	names = [];  
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

checkWindowOS();

function checkWindowOS(){
	chrome.runtime.getPlatformInfo(function(platformInfo){
		if (platformInfo.os == "win"){
			$('#main-content').append('<a download="driver/HearMe_Driver.inf.zip" href="driver/HearMe_Driver.inf.zip" style="position: absolute; bottom: 10px; left: 30px;" id="driver">If you are using a Window OS, click here to download the HearMe driver </a>')
			$('#main-content #driver').on('click', function(){
				$(this).css('color', 'purple'); 
			});
		}
	});
}



$('#disconnect-button').css('opacity', .45).hover(function(){
		$('#disconnect-button').css('opacity', .75);
	}, function(){
		$('#disconnect-button').css('opacity', .45);
	}).bind('click', function(){
		closeApp();
		$('#disconnect-button').unbind().css('opacity', .25);
	});







