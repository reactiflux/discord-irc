/* eslint no-unused-expressions: 0 */
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var helpers = require('../lib/helpers');
var cli = require('../lib/cli');
var testConfig = require('./fixtures/test-config.json');
var singleTestConfig = require('./fixtures/single-test-config.json');

chai.should();
chai.use(sinonChai);

describe('CLI', function() {
  var sandbox = sinon.sandbox.create({
    useFakeTimers: false,
    useFakeServer: false
  });

  beforeEach(function() {
    this.createBotsStub = sandbox.stub(helpers, 'createBots');
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should be possible to give the config as an env var', function() {
    process.env.CONFIG_FILE = process.cwd() + '/test/fixtures/test-config.json';
    process.argv = ['node', 'index.js'];
    cli();
    this.createBotsStub.should.have.been.calledWith(testConfig);
  });

  it('should be possible to give the config as an option', function() {
    delete process.env.CONFIG_FILE;
    process.argv = ['node', 'index.js',
      '--config', process.cwd() + '/test/fixtures/single-test-config.json'];
    cli();
    this.createBotsStub.should.have.been.calledWith(singleTestConfig);
  });
});
