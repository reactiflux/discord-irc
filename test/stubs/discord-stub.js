/* eslint-disable class-methods-use-this */
import events from 'events';
import sinon from 'sinon';

export default function createDiscordStub(sendMessageStub, findUserStub, findRoleStub,
  findEmojiStub) {
  return class DiscordStub extends events.EventEmitter {
    constructor() {
      super();
      this.user = {
        id: 'testid'
      };

      this.channels = {
        filter: () => this.channels,
        get: this.getChannel,
        find: this.getChannel
      };

      this.users = {
        find: findUserStub
      };
      this.options = {
        http: {
          host: 'host'
        }
      };
    }

    getChannel(key, value) {
      if (key === 'name' && value !== 'discord') return null;
      if (key !== '1234' && value === undefined) return null;
      return {
        name: 'discord',
        id: 1234,
        sendMessage: sendMessageStub,
        guild: {
          members: {
            find: findUserStub,
            get: findUserStub,
            filter: findUserStub
          },
          roles: {
            find: findRoleStub,
            get: findRoleStub
          },
          emojis: {
            find: findEmojiStub
          }
        }
      };
    }

    login() {
      return sinon.stub();
    }
  };
}
