/* jshint node: true */
'use strict';

var async = require('async');
var astw = require('astw');
var debug = require('debug')('versionit');
var esprima = require('esprima');
var path = require('path');
var fs = require('fs');
var semver = require('semver');
var Buffer = require('buffer').Buffer;
var reJSON = /\.json$/i;
var reJS = /\.js$/i;
var reVersion = /^(\d+)\.?(\d*)\.?(\d*)$/;
var reLeadingDots = /^\.+/;
var reWhitespace = /\s/;

/**
  # versionit

  `versionit` is a simple versioning helper inspired by the ultra useful
  `npm version` command.  It performs two functions:

  - updates any valid `JSON` files in the current working directory with the updated version.
    A valid file is one that has a top-level `version` attribute.

  - tags the version control used in the cwd with the updated version,
    currently only `git` is supported, but implementing additional SCM
    taggers should be pretty simple.

  ## Why does versionit exist?

  versionit has been written to provide the same functionality (and a little
  bit extra) provided by the `npm version` but in a package manager agnostic
  way.  For instance, we have a number of package management solutions
  poppping up that use a similar approach to NPM but with different
  configuration files.

  Things such as:

  - [component](https://github.com/component/component)
  - [bower](https://github.com/bower/bower)

  ## Usage

  Once installed, you should be able to access the `versionit` command
  in a terminal window.  You can then, update the version in JSON files in
  the cwd in one of the following ways:

  - By running `versionit <versionno>` to explicitly set the version number
    to <versionno>

  - By running `versionit bump` to bump the patch (0.0.x) version of your
    package.

  - By running `versionit bump-minor` to bump the minor (0.x.0) version of
    your package.

  - By running `versionit bump-major` to bump the major (x.0.0) version of
    your package.
    
  - Or just run `versionit` to get the current version of the package.

  ## WARNING: Experimental JS version metadata now included

  If you are considering using versionit with your project, then for the time
  being I would recommend installing the `0.2` version:

  ```
  npm install versionit@0.2 -g
  ```

  From the `0.3` version onwards I have included expreimental support for
  being able to bump version metadata that is included within a `.js` file
  included in your modules root directory.

  For example, consider you have a JS file with the following content:

  ```js
  var metadata = {
    version: '0.1.0'
  };
  ```

  This would be updated by `versionit` to synchronize with the `package.json`
  version once updated by versionit.  This is done by versionit doing a walk
  of the AST of the file and looking specifically for `version` property
  within an object containing a literal value.  If found, the source of the
  file is modified where the version was discovered with updated version
  and written back to the file system.

  __NOTE:__ This does not perform a full regeneration of your source but a
  targeted replacement of the version string.  The only thing that you may
  notice a difference with is if you use double-quotes rather than single
  quotes for your literal strings.

**/

var bumpers = {
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

      callback(null, entries.filter(hasVersion));
    });
  });
}

function detectSCM(opts, callback) {
  var scmPaths = ['.git'].map(function(location) {
    return path.join(opts.cwd, location);
  });

  // if we are skipping scm support, then don't go looking
  if (opts['no-scm']) {
    return callback();
  }

  // look for the scm directories, and then attempt to find a relevant handler
  async.detect(scmPaths, fs.exists || path.exists, function(targetPath) {
    var scmType = path.basename(targetPath).replace(reLeadingDots, '');
    var tagger;

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

function updateJSFiles(targetPath, version) {
  return function(callback) {
    var files = [];
    var walkers;

    function hasVersionMetadata(source) {
      var ast = esprima.parse(source, { range: true });
      var walk = astw(ast);
      var updated = false;
      var range;

      walk(function(node) {
        var foundVersionMetadata = node.type === 'Identifier' &&
          node.name === 'version' &&
          node.parent.type === 'Property' &&
          node.parent.value.type === 'Literal';

        if (foundVersionMetadata) {
          source = updateSource(source, node.parent.value.range);
          updated = true;
        }
      });

      return updated && source;
    }

    function updateSource(source, range) {
      return source.slice(0, range[0]) + 
        '\'' + version + '\'' + source.slice(range[1]);
    }

    fs.readdir(targetPath, function(err, files) {
      files = files.filter(reJS.test.bind(reJS)).map(function(file) {
        return path.join(targetPath, file);
      });

      // read each of the files
      async.map(files, fs.readFile, function(err, entries) {
        if (err) return callback(err);

        entries.forEach(function(buffer, index) {
          var bufferText = buffer.toString();
          var firstLine = bufferText.split("\n")[0];
          if (firstLine.startsWith("#!")) {
            //We're busy with a bang file, will not pass esprima. Remove the line and add it later
            bufferText = bufferText.substr(firstLine.length + 1);
            firstLine = firstLine + '\n';
          } else {
            firstLine = '';
          }
          var updatedSource = hasVersionMetadata(bufferText);

          if (updatedSource) {
            console.log('applied version metadata update to: ' + files[index]);
            fs.writeFileSync(files[index], bufferText + updatedSource);
          }
        });

        // console.log(walkers);
        callback();
      });
    });
  };
}

function updateJSONFiles(files, version) {
  return function(callback) {
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
  };
}

module.exports = function(command, opts, callback) {
  var versionMatch = reVersion.exec(command);
  var versionParts = [0, 0, 0];
  var currentVersion = '0.0.0';

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
    if (err) {
      return callback(err);
    }

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

      debug('attempting to detect currently configured scm, in path: ' + opts.cwd);
      detectSCM(opts, function(err, tagger) {
        if (err) return callback(err);

        async.series([
          updateJSONFiles(files, currentVersion),
          updateJSFiles(opts.cwd, currentVersion)
        ], function(err) {
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
        })
      });
    }
    // otherwise, just report the current version
    else {
      callback(null, versionParts.join('.'));
    }
  });
};
