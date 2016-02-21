# dump-deps

[![NPM version](https://badge.fury.io/js/dump-deps.svg)](http://badge.fury.io/js/dump-deps)
[![Build Status](https://travis-ci.org/redonkulus/dump-deps.svg?branch=master)](https://travis-ci.org/redonkulus/dump-deps)
[![Coverage Status](https://coveralls.io/repos/github/redonkulus/dump-deps/badge.svg?branch=master)](https://coveralls.io/github/redonkulus/dump-deps?branch=master)

Dump package dependencies to display packages with multiple versions.

## Install

```bash
npm i dump-deps -g
```

## Usage

```bash
Dump package dependencies to display packages with multiple versions.
Usage: dump-deps

Options:
  --help, -h       Usage docs.
  --installed, -i  Display dependencies by number of installed packages in ascending order.
  --versions, -v   Display dependencies by versions in ascending order.
```

## Example

```bash
$ dump-deps
Calculating all dependencies....
Duplicate dependencies of app version 1.0.0:
-------------------------------------------
...
path-to-regexp - 1 version(s) - 2 installed
-------------------------------------------
0.1.6
 -> express -> path-to-regexp
 -> webpack-dev-server -> express -> path-to-regexp
 -------------------------------------------
...
You have 238 dependent packages with more than one copy.
You have 693 extra includes in total.
```

## Usecase

This is generally useful for large applications that want to track how many versions of their dependencies are installed. This ensures that your dependency graph is optimized and as small as possible.

## License

MIT. See the [LICENSE](https://github.com/redonkulus/dump-deps/blob/master/LICENSE.md) file for license text and copyright information.
