var async = require('async'),
	fs = require('fs'),
	path = require('path'),
	exec = require('child_process').exec,
	debug = require('debug')('versionit'),
	reKnownStatus = /^\s*[^\?\s]+\s+(.*)$/;

exports.preCheck = function(opts, callback) {
	exec('git status --porcelain', { cwd: opts.cwd }, function(err, stdout, stderr) {
		var dirtyItems;

		if (err) return callback(err);

		// determine whether there are any dirty items in the repo
		// as per NPM's implementation
		dirtyItems = stdout.split(/\n/).filter(reKnownStatus.test.bind(reKnownStatus))

		// if we have dirty items, fire the callback with an error
		callback(dirtyItems.length ? new Error('Working directory not clean') : null);
	});
};

exports.tag = function(version, opts, callback) {
	var message = '"' + (opts.message || 'Bump version to ' + version) + '"',
		commands = [
			'git commit *.json -m ' + message,
			'git tag v' + version + ' -m ' + message
		];

	// run the specified commands
	async.forEachSeries(commands, exec, callback);
};