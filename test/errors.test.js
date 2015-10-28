import chai from 'chai';
import { ConfigurationError } from '../lib/errors';

chai.should();

describe('Errors', () => {
  it('should have a configuration error', () => {
    const error = new ConfigurationError();
    error.message.should.equal('Invalid configuration file given');
    error.should.be.an.instanceof(Error);
  });
});
