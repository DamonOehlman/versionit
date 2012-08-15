var assert = require('assert'),
	versionit = require('..'),
	fs = require('fs'),
	path = require('path'),
	mocker = require('./helpers/mocker'),
	opts = {
		cwd: __dirname
	};

describe('versionit version bumping', function() {
	beforeEach(function(done) {
		mocker.createVersionFile('test.json', { version: '0.1.0' }, done);
	});

	afterEach(function(done) {
		mocker.removeVersionFiles(done);
	});

	it('should be able to bump a patch', function(done) {
		versionit('bump', opts, function(err) {
			assert.ifError(err);

			assert.equal(require('./test.json').version, '0.1.1');
			done(err);
		});
	});
});