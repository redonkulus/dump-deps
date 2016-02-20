'use strict';

var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');
var PromiseLib = require('es6-promise').Promise;
var util = require('util');

/**
 * @class DumpDeps
 * @param {Object} [options]
 * @param {String} [options.shrinkWrapPath=./npm-shrinkwrap.json] Path to shrinkwrap file
 * @constructor
 */
function DumpDeps(options) {
    options = options || {};
    this.shrinkWrapPath = path.resolve(options.shrinkWrapPath || './npm-shrinkwrap.json');
    this.allPkgs = [];
}

/**
 * Use npm shrinkwrap file to collect package dependencies
 * @method init
 * @return {Promise}
 * @async
 */
DumpDeps.prototype.init = function () {
    console.log('Calculating all dependencies....');
    var self = this;
    var extract = function (current, ancestors) {
        var pkgName;
        var next;
        var pkg;

        if (typeof current !== 'undefined') {
            for (pkgName in current) {
                if (current.hasOwnProperty(pkgName)) {
                    next = current[pkgName];
                    pkg = {};
                    pkg.packageName = pkgName;
                    pkg.version = next.version;
                    pkg.ancestors = ancestors + ' -> ' + pkgName;
                    self.allPkgs.push(pkg);
                    extract(next.dependencies, pkg.ancestors);
                }
            }
        }
    };

    var done = function () {
        self.shrinkwrap = self.readShrinkwrap();
        extract(self.shrinkwrap.dependencies, '');
    };

    if (!self.hasShrinkwrap()) {
        return self.createShrinkwrap().then(function() {
            done();
        });
    } else {
        done();
        return PromiseLib.resolve();
    }
};

/**
 * @method createShrinkwrap
 * @return {Promise}
 * @async
 */
DumpDeps.prototype.createShrinkwrap = function () {
    return this.executeCommand('npm shrinkwrap');
};

/**
 * @method deleteShrinkwrap
 * @return {Promise}
 * @async
 */
DumpDeps.prototype.deleteShrinkwrap = function () {
    if (!this.hasShrinkwrap()) {
        return PromiseLib.resolve();
    }
    return this.executeCommand('rm -f ' + this.shrinkWrapPath);
};

/**
 * @method display
 * @param {String} [sort] Sort packages by most versions or number of installed
 * @return {Object} DumpDeps instance
 */
DumpDeps.prototype.display = function(sort) {
    var shrinkwrap = this.readShrinkwrap();
    var packages = this.filterPackages();

    switch (sort) {
        case 'installed':
            packages = this.sortByInstalled(packages);
            break;
        case 'versions':
            packages = this.sortByVersions(packages);
            break;
    }

    // print the packages with more than one copy
    console.log('Duplicate dependencies of ' + shrinkwrap.name + ' version ' + shrinkwrap.version + ':');
    if (packages.length > 0) {
        console.log('-------------------------------------------');
        packages.forEach(function (packageObj) {
            // collect number of packages installed
            var packageCount = this.getNumberOfPackagesInstalled(packageObj);

            // header
            var header = util.format(
                            '%s - %s version(s) - %s installed',
                            packageObj.packageName,
                            packageObj.versions.length,
                            packageCount
                        );
            console.log(header);
            console.log(Array(header.split('').length + 1).join('-'));

            // display paths to each version
            packageObj.versions.forEach(function(version) {
                console.log(version.versionNumber);
                version.paths.forEach(function(path) {
                    console.log(path);
                });
            });

            console.log('');
        }.bind(this));
    }

    console.log('-------------------------------------------');
    console.log('You have ' + packages.length + ' dependent packages with more than one copy.');

    var totalExtraIncludes = 0;
    packages.forEach(function eachPackageWithMoreThanOneCopy(packageObj) {
        packageObj.versions.forEach(function eachPackageVersion(versionObj) {
            totalExtraIncludes += versionObj.paths.length;
        });
    });

    totalExtraIncludes -= packages.length;
    console.log('You have ' + totalExtraIncludes + ' extra includes in total.');

    return this;
};

/**
 * @method executeCommand
 * @param {String} cmd Command to execute
 * @return {Promise}
 * @async
 */
DumpDeps.prototype.executeCommand = function (cmd) {
    return new PromiseLib(function (resolve, reject) {
        console.log('Running command: ' + cmd);
        exec(cmd, { maxBuffer: 1000 * 1024 },
            function (err, stdout, stderr) {
                if (err) {
                    reject(err);
                } else {
                    console.log('Successfully executed %s.', cmd);
                    resolve();
                }
            }
        );
    });
};

/**
 * Sort packages alphabetically and only return ones with multiple versions
 * An array of packages. a package is defined by {
 *       v_1: [paths],
 *       v_2: [paths]
 *   }
 * @method filterPackages
 * @return {Array} packages
 */
DumpDeps.prototype.filterPackages = function() {
    if (this.allPkgs.length < 1) {
        throw new Error('Failed to get all dependencies');
    }

    var packages = {};
    var packageObj;
    var versions;

    // collect package information
    this.allPkgs.forEach(function eachPackage(pkg) {
        var name = pkg.packageName;
        if (!packages[name]) {
            packages[name] = {};
        }
        packageObj = packages[name];
        var version = pkg.version;
        if (!packageObj[version]) {
            packageObj[version] = [];
        }
        versions = packageObj[version];
        versions.push(pkg.ancestors);
    });

    // sort packages and versions
    var paths;
    var sortedPackages = [];
    function compareVersionObjects(version1, version2) {
        return version1.versionNumber.localeCompare(version2.versionNumber);
    }
    for (var name in packages) {
        if (packages.hasOwnProperty(name)) {
            packageObj = packages[name];
            versions = [];
            for (var version in packageObj) {
                if (packageObj.hasOwnProperty(version)) {
                    paths = packageObj[version];
                    versions.push({
                        versionNumber: version,
                        paths: paths
                    });
                }
            }
            versions.sort(compareVersionObjects);

            sortedPackages.push({
                packageName: name,
                versions: versions
            });
        }
    }

    // alphabetize packages
    sortedPackages.sort(function (package1, package2) {
        return package1.packageName.localeCompare(package2.packageName);
    });

    // keep only packages with more than one copy
    var packagesWithMoreThanOneCopy = sortedPackages.filter(function (packageObj) {
        return packageObj.versions.length > 1 || packageObj.versions[0].paths.length > 1;
    });

    return packagesWithMoreThanOneCopy;
};

/**
 * @method getAllPkgs
 * @return {Array} All packages found
 */
DumpDeps.prototype.getAllPkgs = function () {
    return this.allPkgs;
};

/**
 * @method hasShrinkwrap
 * @return {Boolean} Whether shrinkwrap exists
 */
DumpDeps.prototype.hasShrinkwrap = function () {
    return fs.existsSync(this.shrinkWrapPath);
};

/**
 * @method readShrinkwrap
 * @return {String} Shrinkwrap file contents
 */
DumpDeps.prototype.readShrinkwrap = function () {
    return JSON.parse(fs.readFileSync(this.shrinkWrapPath));
};

/**
 * Gets number of packages installed for a package
 * @method sortByInstalled
 * @param {Object} packageObj Package to sort
 * @return {Number} Number of installed packages
 * @private
 */
DumpDeps.prototype.getNumberOfPackagesInstalled = function(packageObj) {
    var packageCount = 0;
    packageObj.versions.forEach(function(version) {
        packageCount += version.paths.length;
    });
    return packageCount;
};

/**
 * Sort packages in ascending order by number of installed
 * @method sortByInstalled
 * @param {Array} packages List of packages
 * @return {Array} Packages in ascending order
 */
/* istanbul ignore next */
DumpDeps.prototype.sortByInstalled = function(packages) {
    packages.sort(function (package1, package2) {
        var package1Count = this.getNumberOfPackagesInstalled(package1);
        var package2Count = this.getNumberOfPackagesInstalled(package2);

        if (package1Count > package2Count) {
            return 1;
        }

        if (package1Count < package2Count) {
            return -1;
        }

        return 0;
    }.bind(this));
    return packages;
};

/**
 * Sort packages by version
 * @method sortByVersions
 * @param {Array} packages List of packages
 * @return {Array} Packages in ascending order
 */
/* istanbul ignore next */
DumpDeps.prototype.sortByVersions = function(packages) {
    packages.sort(function (package1, package2) {
        var version1 = package1.versions;
        var version2 = package2.versions;

        if (version1 > version2) {
            return 1;
        }

        if (version1 < version2) {
            return -1;
        }

        return 0;
    });
    return packages;
};

module.exports = DumpDeps;
