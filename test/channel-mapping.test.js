var chai = require('chai');
var irc = require('irc');
var discord = require('discord.js');
var ConfigurationError = require('../lib/errors').ConfigurationError;
var validateChannelMapping = require('../lib/validators').validateChannelMapping;
var Bot = require('../lib/bot');
var config = require('./fixtures/single-test-config.json');
var caseConfig = require('./fixtures/case-sensitivity-config.json');
var DiscordStub = require('./stubs/discord-stub');
var ClientStub = require('./stubs/irc-client-stub');

chai.should();

describe('Channel Mapping', function() {
  before(function() {
    irc.Client = ClientStub;
    discord.Client = DiscordStub;
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
    bot.channelMapping['#discord'].should.equal('#irc');
    bot.invertedMapping['#irc'].should.equal('#discord');
    bot.channels[0].should.equal('#irc channelKey');
  });

  it('should lowercase IRC channel names', function() {
    var bot = new Bot(caseConfig);
    bot.channelMapping['#discord'].should.equal('#irc');
    bot.channelMapping['#otherDiscord'].should.equal('#otherirc');
  });
});
