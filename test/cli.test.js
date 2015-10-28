/* eslint no-unused-expressions: 0 */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import * as helpers from '../lib/helpers';
import cli from '../lib/cli';
import testConfig from './fixtures/test-config.json';
import singleTestConfig from './fixtures/single-test-config.json';

chai.should();
chai.use(sinonChai);

describe('CLI', function() {
  const sandbox = sinon.sandbox.create({
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
