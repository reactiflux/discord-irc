/* eslint-disable class-methods-use-this */
import events from 'events';
import sinon from 'sinon';

export default function createDiscordStub(sendMessageStub, findUserStub) {
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
    }

    getChannel(key, value) {
      if (key === 'name' && value !== 'discord') return null;
      return {
        name: 'discord',
        id: 1234,
        sendMessage: sendMessageStub,
        guild: {
          members: {
            find: findUserStub,
            get: findUserStub
          }
        }
      };
    }

    login() {
      return sinon.stub();
    }
  };
}
