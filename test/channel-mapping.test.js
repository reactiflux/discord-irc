import chai from 'chai';
import irc from 'irc-upd';
import discord from 'discord.js';
import Bot from '../lib/bot';
import config from './fixtures/single-test-config.json';
import caseConfig from './fixtures/case-sensitivity-config.json';
import DiscordStub from './stubs/discord-stub';
import ClientStub from './stubs/irc-client-stub';
import { validateChannelMapping } from '../lib/validators';

chai.should();

describe('Channel Mapping', () => {
  before(() => {
    irc.Client = ClientStub;
    discord.Client = DiscordStub;
  });

  it('should fail when not given proper JSON', () => {
    const wrongMapping = 'not json';
    function wrap() {
      validateChannelMapping(wrongMapping);
    }

    (wrap).should.throw('Invalid channel mapping given');
  });

  it('should not fail if given a proper channel list as JSON', () => {
    const correctMapping = { '#channel': '#otherchannel' };
    function wrap() {
      validateChannelMapping(correctMapping);
    }

    (wrap).should.not.throw();
  });

  it('should clear channel keys from the mapping', () => {
    const bot = new Bot(config);
    bot.channelMapping['#discord'].should.equal('#irc');
    bot.invertedMapping['#irc'].should.equal('#discord');
    bot.channels.should.contain('#irc channelKey');
  });

  it('should lowercase IRC channel names', () => {
    const bot = new Bot(caseConfig);
    bot.channelMapping['#discord'].should.equal('#irc');
    bot.channelMapping['#otherDiscord'].should.equal('#otherirc');
  });

  it('should work with ID maps', () => {
    const bot = new Bot(config);
    bot.channelMapping['1234'].should.equal('#channelforid');
    bot.invertedMapping['#channelforid'].should.equal('1234');
  });
});
