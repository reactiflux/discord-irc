/* eslint no-unused-expressions: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Bot from '../lib/bot';
import index from '../lib/index';
import testConfig from './fixtures/test-config.json';
import singleTestConfig from './fixtures/single-test-config.json';
import badConfig from './fixtures/bad-config.json';
import stringConfig from './fixtures/string-config.json';
import { createBots } from '../lib/helpers';
import { ConfigurationError } from '../lib/errors';

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
    const bots = createBots(testConfig);
    bots.length.should.equal(2);
    this.connectStub.should.have.been.called;
  });

  it('should work when given an object as a config file', function() {
    const bots = createBots(singleTestConfig);
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

  it('should be possible to run it through require(\'discord-irc\')', function() {
    const bots = index(singleTestConfig);
    bots.length.should.equal(1);
    this.connectStub.should.have.been.called;
  });
});
