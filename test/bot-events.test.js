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

  const createBot = (optConfig = null) => {
    const useConfig = optConfig || config;
    const bot = new Bot(useConfig);
    bot.sendToIRC = sandbox.stub();
    bot.sendToDiscord = sandbox.stub();
    bot.sendExactToDiscord = sandbox.stub();
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

  it('should not send name change event to discord', function () {
    const channel = '#channel';
    const oldnick = 'user1';
    const newnick = 'user2';
    this.bot.ircClient.emit('nick', oldnick, newnick, [channel]);
    this.bot.sendExactToDiscord.should.not.have.been.called;
  });

  it('should send name change event to discord', function () {
    const channel1 = '#channel1';
    const channel2 = '#channel2';
    const channel3 = '#channel3';
    const oldNick = 'user1';
    const newNick = 'user2';
    const user3 = 'user3';
    const bot = createBot({ ...config, ircStatusNotices: true });
    const staticChannel = new Set([bot.nickname, user3]);
    bot.connect();
    bot.ircClient.emit('names', channel1, { [bot.nickname]: '', [oldNick]: '' });
    bot.ircClient.emit('names', channel2, { [bot.nickname]: '', [user3]: '' });
    const channelNicksPre = new Set([bot.nickname, oldNick]);
    bot.channelUsers.should.deep.equal({ '#channel1': channelNicksPre, '#channel2': staticChannel });
    const formattedText = `*${oldNick}* is now known as ${newNick}`;
    const channelNicksAfter = new Set([bot.nickname, newNick]);
    bot.ircClient.emit('nick', oldNick, newNick, [channel1, channel2, channel3]);
    bot.sendExactToDiscord.should.have.been.calledWithExactly(channel1, formattedText);
    bot.channelUsers.should.deep.equal({ '#channel1': channelNicksAfter, '#channel2': staticChannel });
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

  it('should keep track of users through names event when irc status notices enabled', function () {
    const bot = createBot({ ...config, ircStatusNotices: true });
    bot.connect();
    bot.channelUsers.should.be.an('object');
    const channel = '#channel';
    // nick => '' means the user is not a special user
    const nicks = { [bot.nickname]: '', user: '', user2: '@', user3: '+' };
    bot.ircClient.emit('names', channel, nicks);
    const channelNicks = new Set([bot.nickname, 'user', 'user2', 'user3']);
    bot.channelUsers.should.deep.equal({ '#channel': channelNicks });
  });

  it('should lowercase the channelUsers mapping', function () {
    const bot = createBot({ ...config, ircStatusNotices: true });
    bot.connect();
    const channel = '#channelName';
    const nicks = { [bot.nickname]: '' };
    bot.ircClient.emit('names', channel, nicks);
    const channelNicks = new Set([bot.nickname]);
    bot.channelUsers.should.deep.equal({ '#channelname': channelNicks });
  });

  it('should send join messages to discord when config enabled', function () {
    const bot = createBot({ ...config, ircStatusNotices: true });
    bot.connect();
    const channel = '#channel';
    bot.ircClient.emit('names', channel, { [bot.nickname]: '' });
    const nick = 'user';
    const text = `*${nick}* has joined the channel`;
    bot.ircClient.emit('join', channel, nick);
    bot.sendExactToDiscord.should.have.been.calledWithExactly(channel, text);
    const channelNicks = new Set([bot.nickname, nick]);
    bot.channelUsers.should.deep.equal({ '#channel': channelNicks });
  });

  it('should not announce itself joining by default', function () {
    const bot = createBot({ ...config, ircStatusNotices: true });
    bot.connect();
    const channel = '#channel';
    bot.ircClient.emit('names', channel, { [bot.nickname]: '' });
    const nick = bot.nickname;
    bot.ircClient.emit('join', channel, nick);
    bot.sendExactToDiscord.should.not.have.been.called;
    const channelNicks = new Set([bot.nickname]);
    bot.channelUsers.should.deep.equal({ '#channel': channelNicks });
  });

  it('should announce the bot itself when config enabled', function () {
    // self-join is announced before names (which includes own nick)
    // hence don't trigger a names and don't expect anything of bot.channelUsers
    const bot = createBot({ ...config, ircStatusNotices: true, announceSelfJoin: true });
    bot.connect();
    const channel = '#channel';
    const nick = this.bot.nickname;
    const text = `*${nick}* has joined the channel`;
    bot.ircClient.emit('join', channel, nick);
    bot.sendExactToDiscord.should.have.been.calledWithExactly(channel, text);
  });

  it('should send part messages to discord when config enabled', function () {
    const bot = createBot({ ...config, ircStatusNotices: true });
    bot.connect();
    const channel = '#channel';
    const nick = 'user';
    bot.ircClient.emit('names', channel, { [bot.nickname]: '', [nick]: '' });
    const originalNicks = new Set([bot.nickname, nick]);
    bot.channelUsers.should.deep.equal({ '#channel': originalNicks });
    const reason = 'Leaving';
    const text = `*${nick}* has left the channel (${reason})`;
    bot.ircClient.emit('part', channel, nick, reason);
    bot.sendExactToDiscord.should.have.been.calledWithExactly(channel, text);
    // it should remove the nickname from the channelUsers list
    const channelNicks = new Set([bot.nickname]);
    bot.channelUsers.should.deep.equal({ '#channel': channelNicks });
  });

  it('should not announce itself leaving a channel', function () {
    const bot = createBot({ ...config, ircStatusNotices: true });
    bot.connect();
    const channel = '#channel';
    bot.ircClient.emit('names', channel, { [bot.nickname]: '', user: '' });
    const originalNicks = new Set([bot.nickname, 'user']);
    bot.channelUsers.should.deep.equal({ '#channel': originalNicks });
    const reason = 'Leaving';
    bot.ircClient.emit('part', channel, bot.nickname, reason);
    bot.sendExactToDiscord.should.not.have.been.called;
    // it should remove the nickname from the channelUsers list
    bot.channelUsers.should.deep.equal({});
  });

  it('should only send quit messages to discord for channels the user is tracked in', function () {
    const bot = createBot({ ...config, ircStatusNotices: true });
    bot.connect();
    const channel1 = '#channel1';
    const channel2 = '#channel2';
    const channel3 = '#channel3';
    const nick = 'user';
    bot.ircClient.emit('names', channel1, { [bot.nickname]: '', [nick]: '' });
    bot.ircClient.emit('names', channel2, { [bot.nickname]: '' });
    bot.ircClient.emit('names', channel3, { [bot.nickname]: '', [nick]: '' });
    const reason = 'Quit: Leaving';
    const text = `*${nick}* has quit (${reason})`;
    // send quit message for all channels on server, as the node-irc library does
    bot.ircClient.emit('quit', nick, reason, [channel1, channel2, channel3]);
    bot.sendExactToDiscord.should.have.been.calledTwice;
    bot.sendExactToDiscord.getCall(0).args.should.deep.equal([channel1, text]);
    bot.sendExactToDiscord.getCall(1).args.should.deep.equal([channel3, text]);
  });

  it('should not crash with join/part/quit messages and weird channel casing', function () {
    const bot = createBot({ ...config, ircStatusNotices: true });
    bot.connect();

    function wrap() {
      const nick = 'user';
      const reason = 'Leaving';
      bot.ircClient.emit('names', '#Channel', { [bot.nickname]: '' });
      bot.ircClient.emit('join', '#cHannel', nick);
      bot.ircClient.emit('part', '#chAnnel', nick, reason);
      bot.ircClient.emit('join', '#chaNnel', nick);
      bot.ircClient.emit('quit', nick, reason, ['#chanNel']);
    }
    (wrap).should.not.throw();
  });

  it('should be possible to disable join/part/quit messages', function () {
    const bot = createBot({ ...config, ircStatusNotices: false });
    bot.connect();
    const channel = '#channel';
    const nick = 'user';
    const reason = 'Leaving';

    bot.ircClient.emit('names', channel, { [bot.nickname]: '' });
    bot.ircClient.emit('join', channel, nick);
    bot.ircClient.emit('part', channel, nick, reason);
    bot.ircClient.emit('join', channel, nick);
    bot.ircClient.emit('quit', nick, reason, [channel]);
    bot.sendExactToDiscord.should.not.have.been.called;
  });

  it('should warn if it receives a part/quit before a names event', function () {
    const bot = createBot({ ...config, ircStatusNotices: true });
    bot.connect();
    const channel = '#channel';
    const reason = 'Leaving';

    bot.ircClient.emit('part', channel, 'user1', reason);
    bot.ircClient.emit('quit', 'user2', reason, [channel]);
    this.warnSpy.should.have.been.calledTwice;
    this.warnSpy.getCall(0).args.should.deep.equal([`No channelUsers found for ${channel} when user1 parted.`]);
    this.warnSpy.getCall(1).args.should.deep.equal([`No channelUsers found for ${channel} when user2 quit, ignoring.`]);
  });

  it('should not crash if it uses a different name from config', function () {
    // this can happen when a user with the same name is already connected
    const bot = createBot({ ...config, nickname: 'testbot' });
    bot.connect();
    const newName = 'testbot1';
    bot.ircClient.nick = newName;
    function wrap() {
      bot.ircClient.emit('join', '#channel', newName);
    }
    (wrap).should.not.throw;
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
