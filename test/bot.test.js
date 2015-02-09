/* jshint expr: true */
var chai = require('chai');
var sinon = require('sinon');
var irc = require('irc');
var createBots = require('../lib/helpers').createBots;
var ConfigurationError = require('../lib/errors').ConfigurationError;

chai.should();

describe('Bot', function() {
  var addListenerStub = sinon.stub();
  var sayStub = sinon.stub();

  before(function() {
    function clientStub() {}
    clientStub.prototype.addListener = addListenerStub;
    clientStub.prototype.say = sayStub;
    irc.Client = clientStub;

    process.env.CONFIG_FILE = process.cwd() + '/test/test-config.json';
  });

  afterEach(function() {
    sayStub.reset();
    addListenerStub.reset();
  });

  it('should work when given an array of configs', function() {
    process.env.CONFIG_FILE = process.cwd() + '/test/test-config.json';
    var bots = createBots();
    bots.length.should.equal(2);

    // 3 listeners per bot, two bots = 6
    addListenerStub.should.have.callCount(6);
  });

  it('should work when given an object as a config file', function() {
    process.env.CONFIG_FILE = process.cwd() + '/test/single-test-config.json';
    var bots = createBots();
    bots.length.should.equal(1);
    addListenerStub.should.have.been.called;
  });

  it('should throw a configuration error if any fields are missing', function() {
    process.env.CONFIG_FILE = process.cwd() + '/test/bad-config.json';
    function wrap() {
      createBots();
    }
    (wrap).should.throw(ConfigurationError, 'Missing configuration field nickname');
  });

  it('should throw if a configuration file is neither an object or an array', function() {
    process.env.CONFIG_FILE = process.cwd() + '/test/string-config.json';

    function wrap() {
      createBots();
    }
    (wrap).should.throw(ConfigurationError);
  });
});
