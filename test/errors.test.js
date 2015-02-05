var chai = require('chai');
var errors = require('../lib/errors');

chai.should();

describe('Errors', function() {
  it('should have a channel mapping error', function() {
    var error = new errors.ChannelMappingError();
    error.message.should.equal('Invalid channel mapping given');
    error.should.be.an.instanceof(Error);
  });
});
