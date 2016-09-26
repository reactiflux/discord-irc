/* eslint-disable class-methods-use-this */
import events from 'events';
import sinon from 'sinon';

export function getChannel(key, value) {
  if (key === 'name' && value !== 'discord') return null;
  return {
    name: 'discord',
    id: 1234
  };
}

class DiscordStub extends events.EventEmitter {
  constructor() {
    super();
    this.user = {
      id: 'testid'
    };

    this.channels = {
      get: getChannel
    };
  }

  loginWithToken() {
    return sinon.stub();
  }
}

export default DiscordStub;
