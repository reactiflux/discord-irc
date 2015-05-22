/* jshint expr: true */
var chai = require('chai');
var logger = require('winston');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var createBots = require('../lib/helpers').createBots;
var Bot = require('../lib/bot');
var ConfigurationError = require('../lib/errors').ConfigurationError;
var index = require('../index');
var testConfig = require('./fixtures/test-config.json');
var singleTestConfig = require('./fixtures/single-test-config.json');
var badConfig = require('./fixtures/bad-config.json');
var stringConfig = require('./fixtures/string-config.json');

chai.should();
chai.use(sinonChai);

describe('Create Bots', function() {
  before(function() {
    this.connectStub = sinon.stub();
    Bot.prototype.connect = this.connectStub;
  });

  afterEach(function() {
    this.connectStub.reset();
  });

  it('should work when given an array of configs', function() {
    var bots = createBots(testConfig);
    bots.length.should.equal(2);
    this.connectStub.should.have.been.called;
  });

  it('should work when given an object as a config file', function() {
    var bots = createBots(singleTestConfig);
    bots.length.should.equal(1);
    this.connectStub.should.have.been.called;
  });

  it('should throw a configuration error if any fields are missing', function() {
    function wrap() {
      createBots(badConfig);
    }

    (wrap).should.throw(ConfigurationError, 'Missing configuration field nickname');
  });

  it('should throw if a configuration file is neither an object or an array', function() {
    function wrap() {
      createBots(stringConfig);
    }

    (wrap).should.throw(ConfigurationError);
  });

  it('should be possible to run it through require(\'slack-irc\')', function() {
    var bots = index(singleTestConfig);
    bots.length.should.equal(1);
    this.connectStub.should.have.been.called;
  });
});
