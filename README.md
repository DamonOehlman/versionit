# versionit

`versionit` is a simple versioning helper inspired by the ultra useful
`npm version` command.  It performs two functions:

- updates any valid `JSON` files in the current working directory with the updated version.
  A valid file is one that has a top-level `version` attribute.

- tags the version control used in the cwd with the updated version,
  currently only `git` is supported, but implementing additional SCM
  taggers should be pretty simple.


[![NPM](https://nodei.co/npm/versionit.png)](https://nodei.co/npm/versionit/)

[![stable](http://hughsk.github.io/stability-badges/dist/stable.svg)](http://github.com/hughsk/stability-badges)

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

## License(s)

### MIT

Copyright (c) 2014 Damon Oehlman <damon.oehlman@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
