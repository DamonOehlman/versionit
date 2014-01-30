var assert = require('assert'),
	versionit = require('..'),
	fs = require('fs'),
	path = require('path'),
	mocker = require('./helpers/mocker');

function testCommand(command, preVersion, postVersion) {
	return function(done) {
		mocker.createVersionFile('test', { version: preVersion }, function(mockErr) {
			versionit(command, { cwd: __dirname }, function(err) {
				assert.ifError(err);

				// read the data file
				fs.readFile(path.resolve(__dirname, 'test.json'), 'utf8', function(readErr, data) {
					assert.ifError(readErr);
					assert(data);
					assert.equal(JSON.parse(data).version, postVersion);

					// read the js file
					fs.readFile(path.resolve(__dirname, 'test.js'), 'utf8', function(jsReadErr, jsData) {
						var expected = [
							'var metadata = { version: "' + postVersion + '" };',
							'module.exports = metadata.version;'
						].join('\n');

						assert.ifError(jsReadErr);
						assert(jsData);
						assert.equal(jsData, expected);

						done();
					});
				});
			});
		});
	};
}

describe('versionit version bumping', function() {
	afterEach(function(done) {
		mocker.removeVersionFiles(done);
	});

	it('should be able to bump a patch', testCommand('bump', '0.1.0', '0.1.1'));
	it('should be able to bump a minor version', testCommand('bump-minor', '0.1.0', '0.2.0'));
	it('should be able to bump a minor version', testCommand('bump-major', '0.1.0', '1.0.0'));
});