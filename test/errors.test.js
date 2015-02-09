var chai = require('chai');
var errors = require('../lib/errors');

chai.should();

describe('Errors', function() {
  it('should have a configuration error', function() {
    var error = new errors.ConfigurationError();
    error.message.should.equal('Invalid configuration file given');
    error.should.be.an.instanceof(Error);
  });
});
