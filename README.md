# VersionIt

VersionIt is a simple versioning helper inspired by the ultra useful `npm version` command.  It performs two functions:

- updates any valid `JSON` files in the current working directory with the updated version.  A valid file is one that has a top-level `version` attribute.

- tags the version control used in the cwd with the updated version, currently only `git` is supported, but implementing additional SCM taggers should be pretty simple.

<a href="http://travis-ci.org/#!/DamonOehlman/versionit"><img src="https://secure.travis-ci.org/DamonOehlman/versionit.png" alt="Build Status"></a>

## Why does VersionIt exist?

VersionIt has been written to provide the same functionality (and a little bit extra) provided by the `npm version` but in a package manager agnostic way.  For instance, we have a number of package management solutions poppping up that use a similar approach to NPM but with different configuration files.  Things such as:

- [component](/component/component)

## Using VersionIt

To get started with VersionIt, first install it:

```
[sudo] npm install -g versionit
```

Once installed, you should be able to access the `versionit` command from in a terminal window.  You can then, update the version in JSON files in the cwd in one of the following ways:

- By running `versionit <versionno>` to explicitly set the version number to <versionno>
- By running `versionit bump` to bump the patch (0.0.x) version of your package.
- By running `versionit bump-minor` to bump the minor (0.x.0) version of your package.
- By running `versionit bump-major` to bump the major (x.0.0) version of your package.
- Or just run `versionit` to get the current version of the package.