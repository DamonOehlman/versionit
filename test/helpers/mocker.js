var async = require('async');
var path = require('path');
var fs = require('fs');
var _ = require('underscore');

var scaffoldData = {
  name: 'Scaffold Test Data'
};

function canDelete(filename) {
  return (/\.json$/i).test(filename) || filename === 'test.js';
}

exports.removeVersionFiles = function(callback) {
  var basePath = path.resolve(__dirname, '..');

  fs.readdir(basePath, function(err, files) {
    files = (files || []).filter(canDelete).map(function(child) {
      return path.join(basePath, child);
    });

    // delete the files
    async.forEach(files, fs.unlink, callback);
  });
};  

exports.createVersionFile = function(name, opts, callback) {
  function makeJSONFile(cb) {
    // initialise the data
    var data = _.extend({}, scaffoldData, {
      version: '0.1.0'
    }, opts);

    // write 
    fs.writeFile(
      path.resolve(__dirname, '..', name + '.json'), 
      JSON.stringify(data, null, 2), 
      'utf8',
      cb
    );  
  }

  function makeJSFile(cb) {
    var lines = [
      'var metadata = { version: "0.1.0" };',
      'module.exports = metadata.version;'
    ];

    fs.writeFile(
      path.resolve(__dirname, '..', name + '.js'),
      lines.join('\n'),
      'utf8',
      cb
    );
  }

  // handle the 2 args case
  if (typeof opts == 'function') {
    callback = opts;
    opts = {};
  }

  async.parallel([ makeJSONFile, makeJSFile ], callback);
};