export class ConfigurationError extends Error {
  name = 'ConfigurationError'

  constructor(message) {
    super(message);
    this.message = message || 'Invalid configuration file given';
  }
}
