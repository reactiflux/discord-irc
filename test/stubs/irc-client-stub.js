import events from 'events';

class ClientStub extends events.EventEmitter {
  constructor(...args) {
    super();
    this.nick = args[1]; // eslint-disable-line prefer-destructuring
  }
}

export default ClientStub;
