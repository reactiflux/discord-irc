export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message || 'Invalid configuration file given');
    this.name = 'ConfigurationError';
  }
}
