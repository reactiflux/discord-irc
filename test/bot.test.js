/* jshint expr: true */
var chai = require('chai');
var sinonChai = require('sinon-chai');
var sinon = require('sinon');
var rewire = require('rewire');
var irc = require('irc');
var Bot = rewire('../lib/bot');
var SlackStub = require('./stubs/slack-stub');
var ChannelStub = require('./stubs/channel-stub');
var ClientStub = require('./stubs/irc-client-stub');
var config = require('./fixtures/single-test-config.json');

chai.should();
chai.use(sinonChai);

describe('Bot', function() {
  before(function() {
    irc.Client = ClientStub;
    Bot.__set__('Slack', SlackStub);
    this.bot = new Bot(config);
    this.bot.connect();
  });

  afterEach(function() {
    ClientStub.prototype.say.reset();
    ChannelStub.prototype.postMessage.reset();
  });

  it('should invert the channel mapping', function() {
    this.bot.invertedMapping['#irc'].should.equal('#slack');
  });

  it('should send correct message objects to slack', function() {
    var message = {
      text: 'testmessage',
      username: 'testuser',
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/testuser.png'
    };

    this.bot.sendToSlack(message.username, config.channelMapping['#slack'], message.text);
    ChannelStub.prototype.postMessage.should.have.been.calledWith(message);
  });

  it('should send correct messages to irc', function() {
    var text = 'testmessage';
    var message = {
      channel: 'slack',
      getBody: function() {
        return text;
      }
    };

    this.bot.sendToIRC(message);
    var ircText = '<testuser> ' + text;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', ircText);
  });
});
