/* eslint-disable no-unused-expressions, prefer-arrow-callback */
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import irc from 'irc';
import logger from 'winston';
import discord from 'discord.js';
import Bot from '../lib/bot';
import createDiscordStub from './stubs/discord-stub';
import ClientStub from './stubs/irc-client-stub';
import config from './fixtures/single-test-config.json';
import configMsgFormatDefault from './fixtures/msg-formats-default.json';

chai.should();
chai.use(sinonChai);

describe('Bot', function () {
  const sandbox = sinon.sandbox.create({
    useFakeTimers: false,
    useFakeServer: false
  });

  beforeEach(function () {
    this.infoSpy = sandbox.stub(logger, 'info');
    this.debugSpy = sandbox.stub(logger, 'debug');
    this.errorSpy = sandbox.stub(logger, 'error');
    this.sendMessageStub = sandbox.stub();
    this.findUserStub = sandbox.stub();
    this.findRoleStub = sandbox.stub();
    this.findEmojiStub = sandbox.stub();
    irc.Client = ClientStub;
    discord.Client = createDiscordStub(this.sendMessageStub, this.findUserStub, this.findRoleStub,
                                       this.findEmojiStub);
    ClientStub.prototype.say = sandbox.stub();
    ClientStub.prototype.send = sandbox.stub();
    ClientStub.prototype.join = sandbox.stub();
    this.bot = new Bot(config);
    this.bot.connect();
  });

  afterEach(function () {
    sandbox.restore();
  });

  const createAttachments = (url) => {
    const attachments = new discord.Collection();
    attachments.set(1, { url });
    return attachments;
  };

  const createGuildStub = (findRoleStub, nickname = null) => ({
    members: {
      get() {
        return { nickname };
      }
    },
    roles: {
      get: findRoleStub
    }
  });

  it('should invert the channel mapping', function () {
    this.bot.invertedMapping['#irc'].should.equal('#discord');
  });

  it('should send correctly formatted messages to discord', function () {
    const username = 'testuser';
    const text = 'test message';
    const formatted = `**<${username}>** ${text}`;
    this.bot.sendToDiscord(username, '#irc', text);
    this.sendMessageStub.should.have.been.calledWith(formatted);
  });

  it('should lowercase channel names before sending to discord', function () {
    const username = 'testuser';
    const text = 'test message';
    const formatted = `**<${username}>** ${text}`;
    this.bot.sendToDiscord(username, '#IRC', text);
    this.sendMessageStub.should.have.been.calledWith(formatted);
  });

  it('should not send messages to discord if the channel isn\'t in the channel mapping',
  function () {
    this.bot.sendToDiscord('user', '#no-irc', 'message');
    this.sendMessageStub.should.not.have.been.called;
  });

  it('should not send messages to discord if it isn\'t in the channel',
  function () {
    this.bot.sendToDiscord('user', '#otherirc', 'message');
    this.sendMessageStub.should.not.have.been.called;
  });

  it('should send to a discord channel ID appropriately', function () {
    const username = 'testuser';
    const text = 'test message';
    const formatted = `**<${username}>** ${text}`;
    this.bot.sendToDiscord(username, '#channelforid', text);
    this.sendMessageStub.should.have.been.calledWith(formatted);
  });

  it('should not send special messages to discord if the channel isn\'t in the channel mapping',
  function () {
    this.bot.sendExactToDiscord('#no-irc', 'message');
    this.sendMessageStub.should.not.have.been.called;
  });

  it('should not send special messages to discord if it isn\'t in the channel',
  function () {
    this.bot.sendExactToDiscord('#otherirc', 'message');
    this.sendMessageStub.should.not.have.been.called;
  });

  it('should send special messages to discord',
  function () {
    this.bot.sendExactToDiscord('#irc', 'message');
    this.sendMessageStub.should.have.been.calledWith('message');
    this.debugSpy.should.have.been.calledWith('Sending special message to Discord', 'message', '#irc', '->', '#discord');
  });

  it('should not color irc messages if the option is disabled', function () {
    const text = 'testmessage';
    const newConfig = { ...config, ircNickColor: false };
    const bot = new Bot(newConfig);
    const guild = createGuildStub();
    bot.connect();
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      },
      guild
    };

    bot.sendToIRC(message);
    const expected = `<${message.author.username}> ${text}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', expected);
  });

  it('should send correct messages to irc', function () {
    const text = 'testmessage';
    const guild = createGuildStub();
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      },
      guild
    };

    this.bot.sendToIRC(message);
    // Wrap in colors:
    const expected = `<\u000304${message.author.username}\u000f> ${text}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', expected);
  });

  it('should send to IRC channel mapped by discord channel ID if available', function () {
    const text = 'test message';
    const guild = createGuildStub();
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        id: 1234,
        name: 'namenotinmapping'
      },
      author: {
        username: 'test',
        id: 'not bot id'
      },
      guild
    };

    // Wrap it in colors:
    const expected = `<\u000312${message.author.username}\u000f> test message`;
    this.bot.sendToIRC(message);
    ClientStub.prototype.say
      .should.have.been.calledWith('#channelforid', expected);
  });

  it('should send to IRC channel mapped by discord channel name if ID not available', function () {
    const text = 'test message';
    const guild = createGuildStub();
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        id: 1235,
        name: 'discord'
      },
      author: {
        username: 'test',
        id: 'not bot id'
      },
      guild
    };

    // Wrap it in colors:
    const expected = `<\u000312${message.author.username}\u000f> test message`;
    this.bot.sendToIRC(message);
    ClientStub.prototype.say
      .should.have.been.calledWith('#irc', expected);
  });

  it('should send attachment URL to IRC', function () {
    const attachmentUrl = 'https://image/url.jpg';
    const guild = createGuildStub();
    const message = {
      content: '',
      mentions: { users: [] },
      attachments: createAttachments(attachmentUrl),
      channel: {
        name: 'discord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      },
      guild
    };

    this.bot.sendToIRC(message);
    const expected = `<\u000304${message.author.username}\u000f> ${attachmentUrl}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', expected);
  });

  it('should send text message and attachment URL to IRC if both exist', function () {
    const text = 'Look at this cute cat picture!';
    const attachmentUrl = 'https://image/url.jpg';
    const guild = createGuildStub();
    const message = {
      content: text,
      attachments: createAttachments(attachmentUrl),
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      },
      guild
    };

    this.bot.sendToIRC(message);

    ClientStub.prototype.say.should.have.been.calledWith('#irc',
      `<\u000304${message.author.username}\u000f> ${text}`);

    const expected = `<\u000304${message.author.username}\u000f> ${attachmentUrl}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', expected);
  });

  it('should not send an empty text message with an attachment to IRC', function () {
    const guild = createGuildStub();
    const message = {
      content: '',
      attachments: createAttachments('https://image/url.jpg'),
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      },
      guild
    };

    this.bot.sendToIRC(message);

    ClientStub.prototype.say.should.have.been.calledOnce;
  });

  it('should not send its own messages to irc', function () {
    const guild = createGuildStub();
    const message = {
      author: {
        username: 'bot',
        id: this.bot.discord.user.id
      },
      guild
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.not.have.been.called;
  });

  it('should not send messages to irc if the channel isn\'t in the channel mapping',
  function () {
    const guild = createGuildStub();
    const message = {
      channel: {
        name: 'wrongdiscord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      },
      guild
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.not.have.been.called;
  });

  it('should parse text from discord when sending messages', function () {
    const text = '<#1234>';
    const guild = createGuildStub();
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'test',
        id: 'not bot id'
      },
      guild
    };

    // Wrap it in colors:
    const expected = `<\u000312${message.author.username}\u000f> #${message.channel.name}`;
    this.bot.sendToIRC(message);
    ClientStub.prototype.say
      .should.have.been.calledWith('#irc', expected);
  });

  it('should use #deleted-channel when referenced channel fails to exist', function () {
    const text = '<#1235>';
    const guild = createGuildStub();
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'test',
        id: 'not bot id'
      },
      guild
    };

    // Discord displays "#deleted-channel" if channel doesn't exist (e.g. <#1235>)
    // Wrap it in colors:
    const expected = `<\u000312${message.author.username}\u000f> #deleted-channel`;
    this.bot.sendToIRC(message);
    ClientStub.prototype.say
      .should.have.been.calledWith('#irc', expected);
  });

  it('should convert user mentions from discord', function () {
    const guild = createGuildStub();
    const message = {
      mentions: {
        users: [{
          id: 123,
          username: 'testuser'
        }],
      },
      content: '<@123> hi',
      guild
    };

    this.bot.parseText(message).should.equal('@testuser hi');
  });

  it('should convert user nickname mentions from discord', function () {
    const guild = createGuildStub();
    const message = {
      mentions: {
        users: [{
          id: 123,
          username: 'testuser'
        }],
      },
      content: '<@!123> hi',
      guild
    };

    this.bot.parseText(message).should.equal('@testuser hi');
  });

  it('should convert twitch emotes from discord', function () {
    const message = {
      mentions: { users: [] },
      content: '<:SCGWat:230473833046343680>'
    };

    this.bot.parseText(message).should.equal(':SCGWat:');
  });

  it('should convert user mentions from IRC', function () {
    const testUser = new discord.User(this.bot.discord, { username: 'testuser', id: '123' });
    this.findUserStub.withArgs('username', testUser.username).returns(testUser);
    this.findUserStub.withArgs(testUser.id).returns(testUser);

    const username = 'ircuser';
    const text = 'Hello, @testuser!';
    const expected = `**<${username}>** Hello, <@${testUser.id}>!`;

    this.bot.sendToDiscord(username, '#irc', text);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should not convert user mentions from IRC if such user does not exist', function () {
    const username = 'ircuser';
    const text = 'See you there @5pm';
    const expected = `**<${username}>** See you there @5pm`;

    this.bot.sendToDiscord(username, '#irc', text);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should convert multiple user mentions from IRC', function () {
    const testUser = new discord.User(this.bot.discord, { username: 'testuser', id: '123' });
    this.findUserStub.withArgs('username', testUser.username).returns(testUser);
    this.findUserStub.withArgs(testUser.id).returns(testUser);
    const anotherUser = new discord.User(this.bot.discord, { username: 'anotheruser', id: '124' });
    this.findUserStub.withArgs('username', anotherUser.username).returns(anotherUser);
    this.findUserStub.withArgs(anotherUser.id).returns(anotherUser);

    const username = 'ircuser';
    const text = 'Hello, @testuser and @anotheruser, was our meeting scheduled @5pm?';
    const expected = `**<${username}>** Hello, <@${testUser.id}> and <@${anotherUser.id}>,` +
     ' was our meeting scheduled @5pm?';

    this.bot.sendToDiscord(username, '#irc', text);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should convert emoji mentions from IRC', function () {
    const testEmoji = new discord.Emoji(this.bot.discord, { id: '987', name: 'testemoji', require_colons: true });
    // require_colons gets translated to requiresColons
    this.findEmojiStub.callsFake((prop) => {
      // prop is a function, proposition
      if (prop(testEmoji)) return testEmoji;
      return null;
    });

    const username = 'ircuser';
    const text = 'Here is a broken :emojitest:, a working :testemoji: and another :emoji: that won\'t parse';
    const expected = `**<${username}>** Here is a broken :emojitest:, a working <:testemoji:987> and another :emoji: that won't parse`;
    this.bot.sendToDiscord(username, '#irc', text);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should convert newlines from discord', function () {
    const message = {
      mentions: { users: [] },
      content: 'hi\nhi\r\nhi\r'
    };

    this.bot.parseText(message).should.equal('hi hi hi ');
  });

  it('should hide usernames for commands to IRC', function () {
    const text = '!test command';
    const guild = createGuildStub();
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'test',
        id: 'not bot id'
      },
      guild
    };

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.getCall(0).args.should.deep.equal([
      '#irc', 'Command sent from Discord by test:'
    ]);
    ClientStub.prototype.say.getCall(1).args.should.deep.equal(['#irc', text]);
  });

  it('should hide usernames for commands to Discord', function () {
    const username = 'ircuser';
    const text = '!command';

    this.bot.sendToDiscord(username, '#irc', text);
    this.sendMessageStub.getCall(0).args.should.deep.equal(['Command sent from IRC by ircuser:']);
    this.sendMessageStub.getCall(1).args.should.deep.equal([text]);
  });

  it('should use nickname instead of username when available', function () {
    const text = 'testmessage';
    const newConfig = { ...config, ircNickColor: false };
    const bot = new Bot(newConfig);
    const nickname = 'discord-nickname';
    const guild = createGuildStub(null, nickname);
    bot.connect();
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      },
      guild
    };

    bot.sendToIRC(message);
    const expected = `<${nickname}> ${text}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', expected);
  });

  it('should convert user nickname mentions from IRC', function () {
    const testUser = new discord.User(this.bot.discord, { username: 'testuser', id: '123', nickname: 'somenickname' });
    this.findUserStub.withArgs('username', testUser.username).returns(testUser);
    this.findUserStub.withArgs('nickname', 'somenickname').returns(testUser);
    this.findUserStub.withArgs('id', testUser.id).returns(testUser);

    const username = 'ircuser';
    const text = 'Hello, @somenickname!';
    const expected = `**<${username}>** Hello, <@${testUser.id}>!`;

    this.bot.sendToDiscord(username, '#irc', text);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should convert username mentions from IRC even if nickname differs', function () {
    const testUser = new discord.User(this.bot.discord, { username: 'testuser', id: '123', nickname: 'somenickname' });
    this.findUserStub.withArgs('username', testUser.username).returns(testUser);
    this.findUserStub.withArgs('nickname', 'somenickname').returns(testUser);
    this.findUserStub.withArgs('id', testUser.id).returns(testUser);

    const username = 'ircuser';
    const text = 'Hello, @testuser!';
    const expected = `**<${username}>** Hello, <@${testUser.id}>!`;

    this.bot.sendToDiscord(username, '#irc', text);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should convert role mentions from discord', function () {
    const testRole = new discord.Role(this.bot.discord, { name: 'example-role', id: '12345' });
    this.findRoleStub.withArgs('name', 'example-role').returns(testRole);
    this.findRoleStub.withArgs('12345').returns(testRole);

    const text = '<@&12345>';
    const guild = createGuildStub(this.findRoleStub);
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'test',
        id: 'not bot id'
      },
      guild
    };

    this.bot.parseText(message).should.equal('@example-role');
  });

  it('should use @deleted-role when referenced role fails to exist', function () {
    const testRole = new discord.Role(this.bot.discord, { name: 'example-role', id: '12345' });
    this.findRoleStub.withArgs('12345').returns(testRole);

    const text = '<@&12346>';
    const guild = createGuildStub(this.findRoleStub);
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'test',
        id: 'not bot id'
      },
      guild
    };

    // Discord displays "@deleted-role" if role doesn't exist (e.g. <@&12346>)
    this.bot.parseText(message).should.equal('@deleted-role');
  });

  it('should convert role mentions from IRC if role mentionable', function () {
    const testRole = new discord.Role(this.bot.discord, { name: 'example-role', id: '12345', mentionable: true });
    this.findRoleStub.withArgs('name', 'example-role').returns(testRole);
    this.findRoleStub.withArgs('12345').returns(testRole);

    const username = 'ircuser';
    const text = 'Hello, @example-role!';
    const expected = `**<${username}>** Hello, <@&${testRole.id}>!`;

    this.bot.sendToDiscord(username, '#irc', text);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should not convert role mentions from IRC if role not mentionable', function () {
    const testRole = new discord.Role(this.bot.discord, { name: 'example-role', id: '12345' });
    this.findRoleStub.withArgs('name', 'example-role').returns(testRole);
    this.findRoleStub.withArgs('12345').returns(testRole);

    const username = 'ircuser';
    const text = 'Hello, @example-role!';
    const expected = `**<${username}>** Hello, @example-role!`;

    this.bot.sendToDiscord(username, '#irc', text);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should successfully send messages with default config', function () {
    const bot = new Bot(configMsgFormatDefault);
    bot.connect();

    bot.sendToDiscord('testuser', '#irc', 'test message');
    this.sendMessageStub.should.have.been.calledOnce;

    const guild = createGuildStub();
    const message = {
      content: 'test message',
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      },
      guild
    };

    bot.sendToIRC(message);
    this.sendMessageStub.should.have.been.calledOnce;
  });

  it('should not replace unmatched patterns', function () {
    const format = { discord: '{$unmatchedPattern} stays intact: {$author} {$text}' };
    const bot = new Bot({ ...configMsgFormatDefault, format });
    bot.connect();

    const username = 'testuser';
    const msg = 'test message';
    const expected = `{$unmatchedPattern} stays intact: ${username} ${msg}`;
    bot.sendToDiscord(username, '#irc', msg);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should respect custom formatting for Discord', function () {
    const format = { discord: '<{$author}> {$ircChannel} => {$discordChannel}: {$text}' };
    const bot = new Bot({ ...configMsgFormatDefault, format });
    bot.connect();

    const username = 'test';
    const msg = 'test @user <#1234>';
    const expected = `<test> #irc => #discord: ${msg}`;
    bot.sendToDiscord(username, '#irc', msg);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should successfully send messages with default config', function () {
    this.bot = new Bot(configMsgFormatDefault);
    this.bot.connect();

    this.bot.sendToDiscord('testuser', '#irc', 'test message');
    this.sendMessageStub.should.have.been.calledOnce;

    const guild = createGuildStub();
    const message = {
      content: 'test message',
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      },
      guild
    };

    this.bot.sendToIRC(message);
    this.sendMessageStub.should.have.been.calledOnce;
  });

  it('should not replace unmatched patterns', function () {
    const format = { discord: '{$unmatchedPattern} stays intact: {$author} {$text}' };
    this.bot = new Bot({ ...configMsgFormatDefault, format });
    this.bot.connect();

    const username = 'testuser';
    const msg = 'test message';
    const expected = `{$unmatchedPattern} stays intact: ${username} ${msg}`;
    this.bot.sendToDiscord(username, '#irc', msg);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should respect custom formatting for regular Discord output', function () {
    const format = { discord: '<{$author}> {$ircChannel} => {$discordChannel}: {$text}' };
    this.bot = new Bot({ ...configMsgFormatDefault, format });
    this.bot.connect();

    const username = 'test';
    const msg = 'test @user <#1234>';
    const expected = `<test> #irc => #discord: ${msg}`;
    this.bot.sendToDiscord(username, '#irc', msg);
    this.sendMessageStub.should.have.been.calledWith(expected);
  });

  it('should respect custom formatting for commands in Discord output', function () {
    const format = { commandPrelude: '{$nickname} from {$ircChannel} sent command to {$discordChannel}:' };
    this.bot = new Bot({ ...configMsgFormatDefault, format });
    this.bot.connect();

    const username = 'test';
    const msg = '!testcmd';
    const expected = 'test from #irc sent command to #discord:';
    this.bot.sendToDiscord(username, '#irc', msg);
    this.sendMessageStub.getCall(0).args.should.deep.equal([expected]);
    this.sendMessageStub.getCall(1).args.should.deep.equal([msg]);
  });

  it('should respect custom formatting for regular IRC output', function () {
    const format = { ircText: '<{$nickname}> {$discordChannel} => {$ircChannel}: {$text}' };
    this.bot = new Bot({ ...configMsgFormatDefault, format });
    this.bot.connect();

    const guild = createGuildStub();
    const message = {
      content: 'test message',
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'testauthor',
        id: 'not bot id'
      },
      guild
    };
    const expected = '<testauthor> #discord => #irc: test message';

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.should.have.been.calledWith('#irc', expected);
  });

  it('should respect custom formatting for commands in IRC output', function () {
    const format = { commandPrelude: '{$nickname} from {$discordChannel} sent command to {$ircChannel}:' };
    this.bot = new Bot({ ...configMsgFormatDefault, format });
    this.bot.connect();

    const text = '!testcmd';
    const guild = createGuildStub();
    const message = {
      content: text,
      mentions: { users: [] },
      channel: {
        name: 'discord'
      },
      author: {
        username: 'testauthor',
        id: 'not bot id'
      },
      guild
    };
    const expected = 'testauthor from #discord sent command to #irc:';

    this.bot.sendToIRC(message);
    ClientStub.prototype.say.getCall(0).args.should.deep.equal(['#irc', expected]);
    ClientStub.prototype.say.getCall(1).args.should.deep.equal(['#irc', text]);
  });

  it('should respect custom formatting for attachment URLs in IRC output', function () {
    const format = { urlAttachment: '<{$nickname}> {$discordChannel} => {$ircChannel}, attachment: {$attachmentURL}' };
    this.bot = new Bot({ ...configMsgFormatDefault, format });
    this.bot.connect();

    const attachmentUrl = 'https://image/url.jpg';
    const guild = createGuildStub();
    const message = {
      content: '',
      mentions: { users: [] },
      attachments: createAttachments(attachmentUrl),
      channel: {
        name: 'discord'
      },
      author: {
        username: 'otherauthor',
        id: 'not bot id'
      },
      guild
    };

    this.bot.sendToIRC(message);
    const expected = `<otherauthor> #discord => #irc, attachment: ${attachmentUrl}`;
    ClientStub.prototype.say.should.have.been.calledWith('#irc', expected);
  });
});
