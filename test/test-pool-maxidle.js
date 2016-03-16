var _ = require('lodash');
var asyncjs = require('async');
var nodeunit = require('nodeunit');
var lolex = require("lolex");
var jinst = require('../lib/jinst');
var Pool = require('../lib/pool');
var java = jinst.getInstance();
var Q = require('q');
var lolex = require("lolex");



if (!jinst.isJvmCreated()) {
  jinst.addOption("-Xrs");
  jinst.setupClasspath(['./drivers/hsqldb.jar',
                        './drivers/derby.jar',
                        './drivers/derbyclient.jar',
                        './drivers/derbytools.jar']);
}

var config = {
  url: 'jdbc:hsqldb:hsql://localhost/xdb',
  user : 'SA',
  password: '',
  minpoolsize: 1,
  maxpoolsize: 1
};

var configWithMaxIdle = {
  url: 'jdbc:hsqldb:hsql://localhost/xdb',
  user : 'SA',
  password: '',
  minpoolsize: 1,
  maxpoolsize: 1,
  maxidle: 20*60*1000 //20 minutes
};

var testpool = null;
var conn1Uuid = null;
var clock = null;
module.exports = {
  group1: {
    setUp: function(callback){
    if (testpool === null) {
        clock = lolex.install();
        testpool = new Pool(config);

        return Q.ninvoke(testpool, 'reserve')
            .then(function (conn) {
              conn1Uuid = conn.uuid;
              return Q.ninvoke(testpool, 'release', conn);
            })
            .then(callback)
        callback();
      }
      callback();
    },
    tearDown: function(callback) {
      clock.uninstall();
      testpool = null;
      callback();
    },
    testreserve_normal: function(test) {
        clock.tick("20:00");
        testpool.reserve(function(err, conn) {
          if (err) {
            console.log(err);
          } else {
            test.expect(4);
            test.equal(conn1Uuid, conn.uuid);
            test.equal(null, err);
            test.equal(testpool._pool.length, 0);
            test.equal(testpool._reserved.length, 1);
            test.done();
          }
        });
    }
  },
  group2: {
    setUp: function(callback) {
      clock = lolex.install();

      if (testpool === null) {
        testpool = new Pool(configWithMaxIdle);

        return Q.ninvoke(testpool, 'reserve')
            .then(function(conn) {
              conn1Uuid = conn.uuid;
              return Q.ninvoke(testpool, 'release', conn);
            })
            .then(callback)
            .catch(function(e){
              console.log(e);
            });
      }
      callback();
    },
    tearDown: function(callback) {
      clock.uninstall();
      callback();
    },
    testreserve_after_max_idle_time: function(test) {
      clock.tick("40:00");
      testpool.reserve(function(err, conn) {
        if (err) {
          console.log(err);
        } else {
          test.expect(4);
          test.notEqual(conn1Uuid, conn.uuid);
          test.equal(null, err);
          test.equal(testpool._pool.length, 0);
          test.equal(testpool._reserved.length, 1);
          test.done();
        }
      });
    }
  }
};
