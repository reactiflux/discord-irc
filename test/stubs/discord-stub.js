import events from 'events';
import sinon from 'sinon';

class DiscordStub extends events.EventEmitter {
  user = {
    id: 'testid'
  }

  getChannel(key, value) {
    if (key === 'name' && value !== 'discord') return null;
    return {
      name: 'discord',
      id: 1234
    };
  }

  login() {
    return sinon.stub();
  }
}

export default DiscordStub;
