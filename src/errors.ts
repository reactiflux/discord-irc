export class ConfigurationError extends Error {
  constructor(message:string) {
    super(message);
    this.name = 'ConfigurationError';
    this.message = message || 'Invalid configuration file given';
  }
}
