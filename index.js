var async = require('async'),
	debug = require('debug')('versionit'),
	path = require('path'),
	fs = require('fs'),
	semver = require('semver'),
	Buffer = require('buffer').Buffer,
	reJSON = /\.json$/i,
	reVersion = /^(\d+)\.?(\d*)\.?(\d*)$/,
	reLeadingDots = /^\.+/,
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
	};

function isEmpty(item) {
	return typeof item != 'undefined';
}

function hasVersion(entry) {
	return entry.data && typeof entry.data.version != 'undefined';
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
			}
			catch (e) {
				return callback(e);
			}

			// convert the data into the correct format
			entries = entries.map(function(entry, index) {
				return {
					filename: versionFiles[index],
					data: entry,
					version: entry.version
				};
			});

			// return the entries for the specified version
			callback(null, entries.filter(hasVersion));
		});
	});
}

function detectSCM(opts, callback) {
	var scmPaths = ['.git'].map(path.join.bind(null, opts.cwd));

	// if we are skipping scm support, then don't go looking
	if (opts['no-scm']) return callback();

	// look for the scm directories, and then attempt to find a relevant handler
	async.detect(scmPaths, fs.exists || path.exists, function(targetPath) {
		var scmType = path.basename(targetPath).replace(reLeadingDots, ''),
			tagger;

		if (scmType) {
			try {
				debug('scmtype "' + scmType + '" detected, attempting to require tagger');
				tagger = require('./lib/taggers/' + scmType);
			}
			catch (e) {
				// unable to load the scm handler for scmtype, display a warning?
			}
		}

		// if we have a tagger and the tagger has a precheck function, run that now
		if (tagger && typeof tagger.preCheck == 'function') {
			tagger.preCheck(opts, function(err) {
				callback(err, tagger);
			});
		}
		// otherwise, just return the tagger if we have one 
		else {
			callback(null, tagger);
		}
	});	
}

function updateVersionFiles(files, version, callback) {
	// iterate through the version files, update the data and write the file
	async.forEach(files, function(filedata, itemCallback) {
		debug('writing update for file: ' + filedata.filename);

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

		// if we have a command, then run an update
		if (command) {
			// if we a command that is a bumper, then bump it
			if (bumpers[command]) {
				bumpers[command](versionParts);
			}

			// update the current version
			currentVersion = versionParts.join('.');

			detectSCM(opts, function(err, tagger) {
				if (err) return callback(err);

				// apply the new version to the version files
				updateVersionFiles(files, currentVersion, function(err) {
					if (err) return callback(err);

					// if we have a tagger, then run that now
					if (tagger) {
						tagger.tag(currentVersion, opts, function(err) {
							callback(err, currentVersion);
						});
					}
					// otherwise, just trigger the callback
					else {
						callback(null, currentVersion);
					}
				});
			});			
		}
		// otherwise, just report the current version
		else {
			callback(null, versionParts.join('.'));
		}
	});
};