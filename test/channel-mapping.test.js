var chai = require('chai');
var ConfigurationError = require('../lib/errors').ConfigurationError;
var validateChannelMapping = require('../lib/validators').validateChannelMapping;
chai.should();

describe('Channel Mapping', function() {
  it('should fail when not given proper JSON', function() {
    var wrongMapping = 'not json';
    function wrap() {
      validateChannelMapping(wrongMapping);
    }
    (wrap).should.throw(ConfigurationError, /Invalid channel mapping given/);
  });

  it('should not fail if given a proper channel list as JSON', function() {
    var correctMapping = { '#channel': '#otherchannel' };
    function wrap() {
      validateChannelMapping(correctMapping);
    }
    (wrap).should.not.throw();
  });
});
