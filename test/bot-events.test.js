/* eslint-disable no-unused-expressions, prefer-arrow-callback */
import chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import irc from 'irc';
import discord from 'discord.js';
import logger from 'winston';
import Bot from '../lib/bot';
import createDiscordStub from './stubs/discord-stub';
import ClientStub from './stubs/irc-client-stub';
import config from './fixtures/single-test-config.json';

chai.should();
chai.use(sinonChai);

describe('Bot Events', function () {
  const sandbox = sinon.sandbox.create({
    useFakeTimers: false,
    useFakeServer: false
  });

  const createBot = () => {
    const bot = new Bot(config);
    bot.sendToIRC = sandbox.stub();
    bot.sendToDiscord = sandbox.stub();
    return bot;
  };

  beforeEach(function () {
    this.infoSpy = sandbox.stub(logger, 'info');
    this.debugSpy = sandbox.stub(logger, 'debug');
    this.warnSpy = sandbox.stub(logger, 'warn');
    this.errorSpy = sandbox.stub(logger, 'error');
    this.sendMessageStub = sandbox.stub();
    this.getUserStub = sandbox.stub();
    irc.Client = ClientStub;
    discord.Client = createDiscordStub(this.sendMessageStub, this.getUserStub);
    ClientStub.prototype.send = sandbox.stub();
    ClientStub.prototype.join = sandbox.stub();
    this.bot = createBot();
    this.bot.connect();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should log on discord ready event', function () {
    this.bot.discord.emit('ready');
    this.infoSpy.should.have.been.calledWithExactly('Connected to Discord');
  });

  it('should log on irc registered event', function () {
    const message = 'registered';
    this.bot.ircClient.emit('registered', message);
    this.infoSpy.should.have.been.calledWithExactly('Connected to IRC');
    this.debugSpy.should.have.been.calledWithExactly('Registered event: ', message);
  });

  it('should try to send autoSendCommands on registered IRC event', function () {
    this.bot.ircClient.emit('registered');
    ClientStub.prototype.send.should.have.been.calledTwice;
    ClientStub.prototype.send.getCall(0)
      .args.should.deep.equal(config.autoSendCommands[0]);
    ClientStub.prototype.send.getCall(1)
      .args.should.deep.equal(config.autoSendCommands[1]);
  });

  it('should error log on error events', function () {
    const discordError = new Error('discord');
    const ircError = new Error('irc');
    this.bot.discord.emit('error', discordError);
    this.bot.ircClient.emit('error', ircError);
    this.errorSpy.getCall(0).args[0].should.equal('Received error event from Discord');
    this.errorSpy.getCall(0).args[1].should.equal(discordError);
    this.errorSpy.getCall(1).args[0].should.equal('Received error event from IRC');
    this.errorSpy.getCall(1).args[1].should.equal(ircError);
  });

  it('should warn log on warn events from discord', function () {
    const discordError = new Error('discord');
    this.bot.discord.emit('warn', discordError);
    const [message, error] = this.warnSpy.firstCall.args;
    message.should.equal('Received warn event from Discord');
    error.should.equal(discordError);
  });

  it('should send messages to irc if correct', function () {
    const message = {
      type: 'message'
    };

    this.bot.discord.emit('message', message);
    this.bot.sendToIRC.should.have.been.calledWithExactly(message);
  });

  it('should send messages to discord', function () {
    const channel = '#channel';
    const author = 'user';
    const text = 'hi';
    this.bot.ircClient.emit('message', author, channel, text);
    this.bot.sendToDiscord.should.have.been.calledWithExactly(author, channel, text);
  });

  it('should send notices to discord', function () {
    const channel = '#channel';
    const author = 'user';
    const text = 'hi';
    const formattedText = `*${text}*`;
    this.bot.ircClient.emit('notice', author, channel, text);
    this.bot.sendToDiscord.should.have.been.calledWithExactly(author, channel, formattedText);
  });

  it('should send actions to discord', function () {
    const channel = '#channel';
    const author = 'user';
    const text = 'hi';
    const formattedText = '_hi_';
    const message = {};
    this.bot.ircClient.emit('action', author, channel, text, message);
    this.bot.sendToDiscord.should.have.been.calledWithExactly(author, channel, formattedText);
  });

  it('should not listen to discord debug messages in production', function () {
    logger.level = 'info';
    const bot = createBot();
    bot.connect();
    const listeners = bot.discord.listeners('debug');
    listeners.length.should.equal(0);
  });

  it('should listen to discord debug messages in development', function () {
    logger.level = 'debug';
    const bot = createBot();
    bot.connect();
    const listeners = bot.discord.listeners('debug');
    listeners.length.should.equal(1);
  });

  it('should join channels when invited', function () {
    const channel = '#irc';
    const author = 'user';
    this.bot.ircClient.emit('invite', channel, author);
    const firstCall = this.debugSpy.getCall(1);
    firstCall.args[0].should.equal('Received invite:');
    firstCall.args[1].should.equal(channel);
    firstCall.args[2].should.equal(author);

    ClientStub.prototype.join.should.have.been.calledWith(channel);
    const secondCall = this.debugSpy.getCall(2);
    secondCall.args[0].should.equal('Joining channel:');
    secondCall.args[1].should.equal(channel);
  });

  it('should not join channels that aren\'t in the channel mapping', function () {
    const channel = '#wrong';
    const author = 'user';
    this.bot.ircClient.emit('invite', channel, author);
    const firstCall = this.debugSpy.getCall(1);
    firstCall.args[0].should.equal('Received invite:');
    firstCall.args[1].should.equal(channel);
    firstCall.args[2].should.equal(author);

    ClientStub.prototype.join.should.not.have.been.called;
    const secondCall = this.debugSpy.getCall(2);
    secondCall.args[0].should.equal('Channel not found in config, not joining:');
    secondCall.args[1].should.equal(channel);
  });
});
