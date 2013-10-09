var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	scaffoldData = {
		name: 'Scaffold Test Data'
	},
	_ = require('underscore');

function isJSON(filename) {
	return (/\.json$/i).test(filename);
}

exports.removeVersionFiles = function(callback) {
	var basePath = path.resolve(__dirname, '..');

	fs.readdir(basePath, function(err, files) {
		files = (files || []).filter(isJSON).map(function(child) {
			return path.join(basePath, child);
		});

		// delete the files
		async.forEach(files, fs.unlink, callback);
	});
};	

exports.createVersionFile = function(name, opts, callback) {
	var data;

	// handle the 2 args case
	if (typeof opts == 'function') {
		callback = opts;
		opts = {};
	}

	// initialise the data
	data = _.extend({}, scaffoldData, {
		version: '0.1.0'
	}, opts);

	// write 
	fs.writeFile(
		path.resolve(__dirname, '..', name), 
		JSON.stringify(data, null, 2), 
		'utf8',
		callback
	);	
};