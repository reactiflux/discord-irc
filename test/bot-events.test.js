/* jshint expr: true */
var chai = require('chai');
var sinonChai = require('sinon-chai');
var sinon = require('sinon');
var rewire = require('rewire');
var irc = require('irc');
var logger = require('winston');
var Bot = rewire('../lib/bot');
var SlackStub = require('./stubs/slack-stub');
var ChannelStub = require('./stubs/channel-stub');
var ClientStub = require('./stubs/irc-client-stub');
var config = require('./fixtures/single-test-config.json');

chai.should();
chai.use(sinonChai);

describe('Bot Events', function() {
  before(function() {
    this.infoSpy = sinon.spy(logger, 'info');
    this.debugSpy = sinon.spy(logger, 'debug');
    this.errorSpy = sinon.spy(logger, 'error');
    irc.Client = ClientStub;
    Bot.__set__('Slack', SlackStub);
    Bot.prototype.sendToIRC = sinon.stub();
    Bot.prototype.sendToSlack = sinon.stub();
    this.bot = new Bot(config);
    this.bot.connect();
  });

  afterEach(function() {
    Bot.prototype.sendToIRC.reset();
    Bot.prototype.sendToSlack.reset();
    ClientStub.prototype.send.reset();
    ClientStub.prototype.join.reset();
    this.infoSpy.reset();
    this.debugSpy.reset();
    this.errorSpy.reset();
  });

  it('should log on slack open event', function() {
    this.bot.slack.emit('open');
    this.debugSpy.should.have.been.calledWithExactly('Connected to Slack');
  });

  it('should try to send autoSendCommands on registered IRC event', function() {
    this.bot.ircClient.emit('registered');
    ClientStub.prototype.send.should.have.been.calledTwice;
    ClientStub.prototype.send.getCall(0).args.should.deep.equal(config.autoSendCommands[0]);
    ClientStub.prototype.send.getCall(1).args.should.deep.equal(config.autoSendCommands[1]);
  });

  it('should error log on error events', function() {
    var slackError = new Error('slack');
    var ircError = new Error('irc');
    this.bot.slack.emit('error', slackError);
    this.bot.ircClient.emit('error', ircError);
    this.errorSpy.getCall(0).args[0].should.equal('Received error event from Slack');
    this.errorSpy.getCall(0).args[1].should.equal(slackError);
    this.errorSpy.getCall(1).args[0].should.equal('Received error event from IRC');
    this.errorSpy.getCall(1).args[1].should.equal(ircError);
  });

  it('should send messages to irc if correct', function() {
    var message = {
      type: 'message'
    };
    this.bot.slack.emit('message', message);
    Bot.prototype.sendToIRC.should.have.been.calledWithExactly(message);
  });

  it('should not send messages to irc if the type isn\'t message', function() {
    var message = {
      type: 'notmessage'
    };
    this.bot.slack.emit('message', message);
    Bot.prototype.sendToIRC.should.have.not.have.been.called;
  });

  it('should not send messages to irc if it has an invalid subtype', function() {
    var message = {
      type: 'message',
      subtype: 'bot_message'
    };
    this.bot.slack.emit('message', message);
    Bot.prototype.sendToIRC.should.have.not.have.been.called;
  });

  it('should send messages to slack', function() {
    var channel = '#channel';
    var author = 'user';
    var text = 'hi';
    this.bot.ircClient.emit('message', author, channel, text);
    Bot.prototype.sendToSlack.should.have.been.calledWithExactly(author, channel, text);
  });

  it('should send notices to slack', function() {
    var channel = '#channel';
    var author = 'user';
    var text = 'hi';
    var formattedText = '*' + text + '*';
    this.bot.ircClient.emit('notice', author, channel, text);
    Bot.prototype.sendToSlack.should.have.been.calledWithExactly(author, channel, formattedText);
  });

  it('should send actions to slack', function() {
    var channel = '#channel';
    var author = 'user';
    var text = 'hi';
    var formattedText = '_hi_';
    var message = {};
    this.bot.ircClient.emit('action', author, channel, text, message);
    Bot.prototype.sendToSlack.should.have.been.calledWithExactly(author, channel, formattedText);
  });

  it('should join channels when invited', function() {
    var channel = '#irc';
    var author = 'user';
    this.bot.ircClient.emit('invite', channel, author);
    var firstCall = this.debugSpy.getCall(0);
    firstCall.args[0].should.equal('Received invite:');
    firstCall.args[1].should.equal(channel);
    firstCall.args[2].should.equal(author);

    ClientStub.prototype.join.should.have.been.calledWith(channel);
    var secondCall = this.debugSpy.getCall(1);
    secondCall.args[0].should.equal('Joining channel:');
    secondCall.args[1].should.equal(channel);
  });

  it('should not join channels that aren\'t in the channel mapping', function() {
    var channel = '#wrong';
    var author = 'user';
    this.bot.ircClient.emit('invite', channel, author);
    var firstCall = this.debugSpy.getCall(0);
    firstCall.args[0].should.equal('Received invite:');
    firstCall.args[1].should.equal(channel);
    firstCall.args[2].should.equal(author);

    ClientStub.prototype.join.should.not.have.been.called;
    var secondCall = this.debugSpy.getCall(1);
    secondCall.args[0].should.equal('Channel not found in config, not joining:');
    secondCall.args[1].should.equal(channel);
  });
});
