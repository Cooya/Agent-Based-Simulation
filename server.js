const fs = require('fs');
const path = require('path');
const util = require('util');
const vm = require('vm');

const express = require('express');
const multer  = require('multer');
const xlsx = require('xlsx');

const PORT = 80;
if(fs.existsSync('files')) emptyDirectory('files');



/* --------------- Express routing ---------------- */

express()
.use(multer({dest: 'files'}).any()) // "multipart/form-data"

.post('/request', function(req, res) {
	processSimulationRequest(req, res);
})

.get('/', function(req, res) {
	res.sendFile(path.join(__dirname, 'index.html'));
})

.use(function(req, res, next) {
	console.error('File "' + req.path + '" not found.');
	sendError(res, 404, 'Resource requested does not exist.');
})

.listen(PORT, function() {
	console.log('Server listening on port ' + PORT + '.');
});



/* ------------------ Simulation ----------------------- */

function processJSON(data, itNb, input, mapFunction, output, reduceFunction) {

	// we set up a context for each entry while appending inputs variables
	console.log('Setting up context for each entry.');
	data.map(function(entry, index, array) {
		for(var key of Object.keys(input))
			entry[key] = input[key];
		vm.createContext(entry);
	});

	// we run the map function on each entry within the context
	for(var i = 0; i < itNb; ++i) {
		console.log('Running map iteration ' + (i + 1) + '.');
		data.map(function(entry, index, array) {
			vm.runInContext(mapFunction, entry);
		});
	}

	// then we run the reduce function on each entry
	console.log('Running reduce function.');
	data.map(function(entry, index, array) {

		// pushing output variables to context
		for(var key of Object.keys(output))
			entry[key] = output[key];

		vm.runInContext(reduceFunction, entry);

		// pulling output variables from context
		for(var key of Object.keys(output))
			output[key] = entry[key];
	});

	output['Total'] = data.length;
}

function readXLSXFile(file, range) {
	console.log('Reading XLSX file.');

	// checking range format
	var coords = range.split(':');
	if(coords.length != 2) return null;

	// reading xlsx file
	var workbook = xlsx.readFile(file);
	var keys = Object.keys(workbook.Sheets['Sheet1']);

	// useful variables
	var letterTopLeft = coords[0].match(/([A-Z]+)/)[0];
	var letterBottomRight = coords[1].match(/([A-Z]+)/)[0];
	var nbLines = parseInt(coords[1].match(/([0-9]+)/)[0]);

	// positioning pointer to the first cell
	var i = 0;
	while(keys[i] != coords[0])
		i++;

	// retrieving header
	var header = [];
	while(!keys[i].match(letterBottomRight))
		header.push(workbook.Sheets['Sheet1'][keys[i++]].w);
	header.push(workbook.Sheets['Sheet1'][keys[i++]].w);

	// building data structure
	var jsonData = [];
	var k;
	var tmp;
	for(var j = 1; j < nbLines + 1; ++j) {
		tmp = {};
		k = 0;

		// skipping cells out of range
		while(!keys[i].match(letterTopLeft))
			i++;

		// retrieving cells in range
		while(!keys[i].match(letterBottomRight))
			tmp[header[k++]] = infer(workbook.Sheets['Sheet1'][keys[i++]].w);
		tmp[header[k++]] = workbook.Sheets['Sheet1'][keys[i++]].w;

		jsonData.push(tmp);
	}

	return jsonData;
}

function readJSONFile(file) {
	console.log('Reading JSON file.');

	var jsonData = fs.readFileSync(file);
	return Array.isArray(jsonData) ? jsonData : null;
}

function processSimulationRequest(req, res) {
	console.log('Simulation request received.');
	if(!req.body.range || !req.body.mapFunction || !req.body.itNb || !req.body.inputVars || !req.body.outputVars)
		sendJSONResponse(res, 'Missing parameter(s) for process the request.');
	else if(!req.files || !req.files[0])
		sendJSONResponse(res, 'None file to process.');
	else {
		var beginTime = new Date().getTime();

		var filepath = path.join(req.files[0].destination, req.files[0].filename);
		var extension = path.extname(req.files[0].originalname);

		// checking file extension and reading file to retrieve a JSON array
		if(extension == '.xlsx') {
			var jsonData = readXLSXFile(filepath, req.body.range);
			if(!jsonData) {
				sendJSONResponse(res, 'Invalid range.');
				return;
			}
		}
		else if(extension == '.json') {
			var jsonData = readJSONFile(filepath);
			if(!jsonData) {
				sendJSONResponse(res, 'The JSON file does not contain any array.');
				return;
			}
		}
		else {
			sendJSONResponse(res, 'Invalid file type.');
			return;
		}

		var input = {};
		vm.createContext(input);
		vm.runInContext(req.body.inputVars, input);

		var output = {};
		vm.createContext(output);
		vm.runInContext(req.body.outputVars, output);

		processJSON(jsonData, req.body.itNb, input, req.body.mapFunction, output, req.body.reduceFunction);
		output.time = (new Date().getTime() - beginTime) / 1000;

		sendJSONResponse(res, null, output);
		console.log('Simulation result sent.');
	}
}



/* ------------------- Utilities ------------------- */

function sendJSONResponse(res, err, result) {
	var response = {};
	if(err)
		response.err = err;
	else {
		response.err = null;
		response.result = result;
	}
	res.json(response);
}

function sendError(res, status, msg) {
	res.setHeader('Content-Type', 'text/plain');
	res.status(status).send(msg);
}

function emptyDirectory(dir, callback) {
	console.log("Cleaning directory \"" + dir + "\".");

	fs.readdir(dir, function(err, files) {
		if(err) {
			console.error(err);
			if(callback) callback(false);
		}
		else
			for(filePath of files)
				fs.unlink(path.join(dir, filePath));
	});
}

function infer(str) {
	var res = str % 1;
	if(isNaN(res)) return str;
	else if(res === 0) return Number.parseInt(str);
	else return Number.parseFloat(str);
}