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
  user = {
    id: 'testid'
  }

  channels = {
    get: getChannel
  }

  login() {
    return sinon.stub();
  }
}

export default DiscordStub;
