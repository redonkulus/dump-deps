/*global require, describe:true, it:true, beforeEach:true, afterEach:true */

'use strict';

var expect = require('chai').expect;
var mockery = require('mockery');
var DumpDependencies;

describe('dump-deps', function () {
    beforeEach(function () {
        mockery.registerMock('child_process', {
            execSync: function(cmd) {
            }
        });
        mockery.enable({ useCleanCache: true, warnOnUnregistered: false });
        DumpDependencies = require('../src/deps');
    });

    afterEach(function () {
        mockery.disable();
        mockery.deregisterAll();
    });

    it('should exist', function () {
        expect(DumpDependencies).to.be.an('function');
        expect(DumpDependencies.prototype.createShrinkwrap).to.be.an('function');
    });

    it('should work', function (done) {
        var expected = [
            {
                ancestors: ' -> foo',
                packageName: 'foo',
                version: '1.0.0'
            },
            {
                ancestors: ' -> foo -> bar',
                packageName: 'bar',
                version: '0.1.0'
            },
            {
                ancestors: ' -> bar',
                packageName: 'bar',
                version: '1.0.0'
            }
        ];
        var deps = new DumpDependencies({ shrinkWrapPath: './test/mockShrinkwrap.json' });
        deps.init().then(function () {
            deps.display();
            expect(deps.getAllPkgs()).eql(expected);
            done();
        });
    });
});
