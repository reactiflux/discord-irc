import events from 'events';
import sinon from 'sinon';

const server = {
  detailsOfUser(username) {
    return { nick: null };
  }
};

export function getChannel(key, value) {
  if (key === 'name' && value !== 'discord') return null;
  return {
    name: 'discord',
    id: 1234,
    server
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
