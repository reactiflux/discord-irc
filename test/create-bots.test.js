/* eslint-disable no-unused-expressions, prefer-arrow-callback */
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

chai.should();
chai.use(sinonChai);

describe('Create Bots', function () {
  const sandbox = sinon.sandbox.create({
    useFakeTimers: false,
    useFakeServer: false
  });

  beforeEach(function () {
    this.connectStub = sandbox.stub(Bot.prototype, 'connect');
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should work when given an array of configs', function () {
    const bots = createBots(testConfig);
    bots.length.should.equal(2);
    this.connectStub.should.have.been.called;
  });

  it('should work when given an object as a config file', function () {
    const bots = createBots(singleTestConfig);
    bots.length.should.equal(1);
    this.connectStub.should.have.been.called;
  });

  it('should throw a configuration error if any fields are missing', function () {
    function wrap() {
      createBots(badConfig);
    }

    (wrap).should.throw('Missing configuration field nickname');
  });

  it('should throw if a configuration file is neither an object or an array', function () {
    function wrap() {
      createBots(stringConfig);
    }

    (wrap).should.throw('Invalid configuration file given');
  });

  it('should be possible to run it through require(\'discord-irc\')', function () {
    const bots = index(singleTestConfig);
    bots.length.should.equal(1);
    this.connectStub.should.have.been.called;
  });
});
