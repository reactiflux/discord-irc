/* eslint-disable class-methods-use-this */
import events from 'events';
import sinon from 'sinon';
import discord from 'discord.js';

export default function createDiscordStub(sendStub, guild, discordUsers) {
  return class DiscordStub extends events.EventEmitter {
    constructor() {
      super();
      this.user = {
        id: 'testid'
      };
      this.channels = this.guildChannels();

      this.users = discordUsers;
    }

    guildChannels() {
      const channels = new discord.Collection();
      channels.set('1234', {
        name: 'discord',
        id: '1234',
        type: 'text',
        send: sendStub,
        guild
      });
      return channels;
    }

    login() {
      return sinon.stub();
    }
  };
}
