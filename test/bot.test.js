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
    this.bot.slack.resetStub();
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

    this.bot.sendToSlack(message.username, '#irc', message.text);
    ChannelStub.prototype.postMessage.should.have.been.calledWith(message);
  });

  it('should lowercase channel names before sending to slack', function() {
    var message = {
      text: 'testmessage',
      username: 'testuser',
      parse: 'full',
      icon_url: 'http://api.adorable.io/avatars/48/testuser.png'
    };

    this.bot.sendToSlack(message.username, '#IRC', message.text);
    ChannelStub.prototype.postMessage.should.have.been.calledWith(message);
  });

  it('should not send messages to slack if the channel isn\'t in the channel mapping',
  function() {
    this.bot.sendToSlack('user', '#wrongchan', 'message');
    ChannelStub.prototype.postMessage.should.not.have.been.called;
  });

  it('should not send messages to slack if the bot isn\'t in the channel', function() {
    this.bot.slack.returnWrongStubInfo = true;
    this.bot.sendToSlack('user', '#irc', 'message');
    ChannelStub.prototype.postMessage.should.not.have.been.called;
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

  it('should send /me messages to irc', function() {
    var text = 'testmessage';
    var message = {
      channel: 'slack',
      subtype: 'me_message',
      getBody: function() {
        return text;
      }
    };

    this.bot.sendToIRC(message);
    var ircText = 'Action: testuser ' + text;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', ircText);
  });

  it('should not send messages to irc if the channel isn\'t in the channel mapping',
  function() {
    this.bot.slack.returnWrongStubInfo = true;
    var message = {
      channel: 'wrongchannel'
    };
    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.not.have.been.called;
  });

  it('should parse text from slack when sending messages', function() {
    var text = '<@USOMEID> <@USOMEID|readable>';
    var message = {
      channel: 'slack',
      getBody: function() {
        return text;
      }
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.have.been.calledWith('#irc', '<testuser> @testuser readable');
  });

  it('should parse text from slack', function() {
    this.bot.parseText('hi\nhi\r\nhi\r').should.equal('hi hi hi ');
    this.bot.parseText('>><<').should.equal('>><<');
    this.bot.parseText('<!channel> <!group> <!everyone>')
      .should.equal('@channel @group @everyone');
    this.bot.parseText('<#CSOMEID> <#CSOMEID|readable>')
      .should.equal('#slack readable');
    this.bot.parseText('<@USOMEID> <@USOMEID|readable>')
      .should.equal('@testuser readable');
    this.bot.parseText('<https://example.com>').should.equal('https://example.com');
    this.bot.parseText('<!somecommand> <!somecommand|readable>')
      .should.equal('<somecommand> <readable>');
  });

  it('should parse emojis correctly', function() {
    this.bot.parseText(':smile:').should.equal(':)');
    this.bot.parseText(':train:').should.equal(':train:');
  });

  it('should hide usernames for commands', function() {
    var text = '!test command';
    var message = {
      channel: 'slack',
      getBody: function() {
        return text;
      }
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.getCall(0).args.should.deep.equal([
      '#irc', 'Command sent from Slack by testuser:'
    ]);
    ClientStub.prototype.say.getCall(1).args.should.deep.equal(['#irc', text]);
  });
});
