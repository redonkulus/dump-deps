#!/usr/bin/env node

'use strict';

var pkg = require('../package.json');
var optimist = require('optimist');
var DumpDeps = require('../src/deps.js');

// setup cli params and config
var argv = optimist
    .usage(pkg.description + '\nUsage: $0')
    .options({
        help: {
            alias: 'h',
            describe: 'Usage docs.'
        },
        installed: {
            alias: 'i',
            describe: 'Display dependencies by number of installed packages in ascending order.'
        },
        versions: {
            alias: 'v',
            describe: 'Display dependencies by versions in ascending order.'
        }
    })
    .argv;

// show help message
if (argv.help) {
    optimist.showHelp();
    process.exit();
}

// run dump dependencies
var dump = new DumpDeps();
dump.init().then(function () {
    var sort = '';
    if (argv.installed) {
        sort = 'installed';
    } else if (argv.versions) {
        sort = 'versions';
    }
    dump.display(sort);
})['catch'](function (err) {
    if (err) {
        console.error(err.stack);
    }
});
