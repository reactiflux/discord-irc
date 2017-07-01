import events from 'events';

class ClientStub extends events.EventEmitter {
  constructor(...args) {
    super();
    this.nick = args[1];
  }
}

export default ClientStub;
