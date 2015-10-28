/* eslint no-unused-expressions: 0 */
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var irc = require('irc');
var logger = require('winston');
var discord = require('discord.js');
var Bot = require('../lib/bot');
var DiscordStub = require('./stubs/discord-stub');
var ClientStub = require('./stubs/irc-client-stub');
var config = require('./fixtures/single-test-config.json');

chai.should();
chai.use(sinonChai);

describe('Bot', function() {
  var discordChannel = DiscordStub.prototype.getChannel();
  var sandbox = sinon.sandbox.create({
    useFakeTimers: false,
    useFakeServer: false
  });

  beforeEach(function() {
    sandbox.stub(logger, 'info');
    sandbox.stub(logger, 'debug');
    sandbox.stub(logger, 'error');
    irc.Client = ClientStub;
    discord.Client = DiscordStub;
    DiscordStub.prototype.sendMessage = sandbox.stub();
    ClientStub.prototype.say = sandbox.stub();
    ClientStub.prototype.send = sandbox.stub();
    ClientStub.prototype.join = sandbox.stub();
    this.bot = new Bot(config);
    this.bot.connect();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should invert the channel mapping', function() {
    this.bot.invertedMapping['#irc'].should.equal('#discord');
  });

  it('should send correctly formatted messages to discord', function() {
    var username = 'testuser';
    var text = 'test message';
    var formatted = '**<' + username + '>** ' + text;
    this.bot.sendToDiscord(username, '#irc', text);
    DiscordStub.prototype.sendMessage.should.have.been.calledWith(discordChannel, formatted);
  });

  it('should lowercase channel names before sending to discord', function() {
    var username = 'testuser';
    var text = 'test message';
    var formatted = '**<' + username + '>** ' + text;
    this.bot.sendToDiscord(username, '#IRC', text);
    DiscordStub.prototype.sendMessage.should.have.been.calledWith(discordChannel, formatted);
  });

  it('should not send messages to discord if the channel isn\'t in the channel mapping',
  function() {
    this.bot.sendToDiscord('user', '#otherirc', 'message');
    DiscordStub.prototype.sendMessage.should.not.have.been.called;
  });

  it('should send correct messages to irc', function() {
    var text = 'testmessage';
    var message = {
      content: text,
      mentions: [],
      channel: {
        name: 'discord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      }
    };

    this.bot.sendToIRC(message);
    var ircText = '<' + message.author.username + '> ' + text;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', ircText);
  });

  it('should not send its own messages to irc', function() {
    var message = {
      author: {
        username: 'bot',
        id: this.bot.discord.user.id
      }
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.not.have.been.called;
  });

  it('should not send messages to irc if the channel isn\'t in the channel mapping',
  function() {
    var message = {
      channel: {
        name: 'wrongdiscord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      }
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.not.have.been.called;
  });

  it('should parse text from discord when sending messages', function() {
    var text = '<#1234>';
    var message = {
      content: text,
      mentions: [],
      channel: {
        name: 'discord'
      },
      author: {
        username: 'test',
        id: 'not bot id'
      }
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.have.been.calledWith('#irc', '<test> #discord');
  });

  it('should convert user mentions from discord', function() {
    var message = {
      mentions: [{
        id: 123,
        username: 'testuser'
      }],
      content: '<@123> hi'
    };

    this.bot.parseText(message).should.equal('@testuser hi');
  });

  it('should convert newlines from discord', function() {
    var message = {
      mentions: [],
      content: 'hi\nhi\r\nhi\r'
    };

    this.bot.parseText(message).should.equal('hi hi hi ');
  });

  it('should hide usernames for commands', function() {
    var text = '!test command';
    var message = {
      content: text,
      mentions: [],
      channel: {
        name: 'discord'
      },
      author: {
        username: 'test',
        id: 'not bot id'
      }
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.getCall(0).args.should.deep.equal([
      '#irc', 'Command sent from Discord by test:'
    ]);
    ClientStub.prototype.say.getCall(1).args.should.deep.equal(['#irc', text]);
  });
});
