var chai = require('chai');
var rewire = require('rewire');
var irc = require('irc');
var ConfigurationError = require('../lib/errors').ConfigurationError;
var validateChannelMapping = require('../lib/validators').validateChannelMapping;
var Bot = rewire('../lib/bot');
var config = require('./fixtures/single-test-config.json');
var caseConfig = require('./fixtures/case-sensitivity-config.json');
var SlackStub = require('./stubs/slack-stub');
var ClientStub = require('./stubs/irc-client-stub');

chai.should();

describe('Channel Mapping', function() {
  before(function() {
    irc.Client = ClientStub;
    Bot.__set__('Slack', SlackStub);
  });

  it('should fail when not given proper JSON', function() {
    var wrongMapping = 'not json';
    function wrap() {
      validateChannelMapping(wrongMapping);
    }

    (wrap).should.throw(ConfigurationError, /Invalid channel mapping given/);
  });

  it('should not fail if given a proper channel list as JSON', function() {
    var correctMapping = { '#channel': '#otherchannel' };
    function wrap() {
      validateChannelMapping(correctMapping);
    }

    (wrap).should.not.throw();
  });

  it('should clear channel keys from the mapping', function() {
    var bot = new Bot(config);
    bot.channelMapping['#slack'].should.equal('#irc');
    bot.invertedMapping['#irc'].should.equal('#slack');
    bot.channels[0].should.equal('#irc channelKey');
  });

  it('should lowercase IRC channel names', function() {
    var bot = new Bot(caseConfig);
    bot.channelMapping['#slack'].should.equal('#irc');
    bot.channelMapping['#OtherSlack'].should.equal('#otherirc');
  });
});
