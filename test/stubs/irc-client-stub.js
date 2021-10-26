import events from 'events';

/* eslint-disable class-methods-use-this */
class ClientStub extends events.EventEmitter {
  constructor(...args) {
    super();
    this.nick = args[1]; // eslint-disable-line prefer-destructuring
  }

  disconnect() {}
}

export default ClientStub;
