var async = require('async'),
	path = require('path'),
	fs = require('fs'),
	semver = require('semver'),
	reJSON = /\.json$/i,
	reVersion = /^(\d+)\.?(\d*)\.?(\d*)$/,
	bumpers = {
		'bump-major': function(parts) {
			parts[0]++;
			parts[1] = parts[2] = 0;
		},

		'bump-minor': function(parts) {
			parts[1]++;
			parts[2] = 0;
		},

		'bump-patch': function(parts) {
			parts[2]++;
		},

		bump: function(parts) {
			parts[2]++;
		}
	},
	scmHandlers = {
		'.git': function(cwd, version, callback) {
			callback();
		}
	};

function isEmpty(item) {
	return typeof item != 'undefined';
}

function hasVersion(entry) {
	return typeof entry.version != 'undefined';
}

function findVersionFiles(targetPath, callback) {
	var versionFiles = [];

	fs.readdir(targetPath, function(err, files) {
		(files || []).forEach(function(file) {
			if (reJSON.test(file)) {
				versionFiles.push(path.join(targetPath, file));
			}
		});

		// read each of the files
		async.map(versionFiles, fs.readFile, function(err, entries) {
			if (err) return callback(err);

			// parse each of the files
			try {
				entries.forEach(function(entry, index) {
					entries[index] = JSON.parse(entry.toString());
				});

				// return the entries for the specified version
				callback(null, entries.filter(hasVersion).map(function(entry, index) {
					return {
						filename: versionFiles[index],
						data: entry,
						version: entry.version
					};
				}));
			}
			catch (e) {
				callback(e);
			}
		});
	});
}

function tagSourceControl(cwd, version, callback) {
	var scmPaths = Object.keys(scmHandlers).map(path.join.bind(null, cwd));

	async.detect(scmPaths, fs.exists || path.exists, function(targetPath) {
		var handler = scmHandlers[path.basename(targetPath)];

		if (handler) {
			handler(cwd, version, callback);
		}
		else {
			callback();
		}
	});
}

function updateVersionFiles(files, version, callback) {
	// iterate through the version files, update the data and write the file
	async.forEach(files, function(filedata, itemCallback) {
		// update the version in the data
		filedata.data.version = version;

		// write the file
		fs.writeFile(
			filedata.filename, 
			JSON.stringify(filedata.data, null, 2),
			itemCallback
		);
	}, callback);
}

module.exports = function(command, opts, callback) {
	var versionMatch = reVersion.exec(command),
		versionParts = [0, 0, 0],
		currentVersion = '0.0.0';

	// check for the 2 arguments implementation
	if (typeof opts == 'function') {
		callback = opts;
		opts = {};
	}

	// ensure we have opts
	opts = opts || {};

	// initialise the cwd
	opts.cwd = opts.cwd || process.cwd();

	// find .json files in the current directory
	findVersionFiles(opts.cwd, function(err, files) {
		if (err) return callback(err);

		// if we don't have a version match, then extract it from the files
		if (! versionMatch) {
			currentVersion = files.map(function(file) {
				return file.version || '0.0.0';
			}).sort(semver.compare).reverse()[0] || '0.0.0';

			// get the version match for the current version
			versionMatch = reVersion.exec(currentVersion);
		}

		// if we have a version match, then display the details
		if (versionMatch) {
			// extract the version parts
			versionParts = versionMatch.slice(1).filter(isEmpty).concat([0, 0]).slice(0, 3);
		}

		// ensure the version parts are integers
		versionParts = versionParts.map(function(part) {
			return parseInt(part, 10);
		});

		// if we a command that is a bumper, then bump it
		if (bumpers[command]) {
			bumpers[command](versionParts);
		}

		// apply the new version to the version files
		updateVersionFiles(files, versionParts.join('.'), function(err) {
			if (err) return callback(err);

			// if we aren't updating scm, fire the callback
			if (opts['no-scm']) {
				callback();
			}
			else {
				tagSourceControl(opts.cwd, versionParts.join('.'), callback);
			}
		});
	});
};