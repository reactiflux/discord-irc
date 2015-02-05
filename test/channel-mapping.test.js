var chai = require('chai');
var ChannelMappingError = require('../lib/errors').ChannelMappingError;
var validateChannelMapping = require('../lib/helpers').validateChannelMapping;
chai.should();

describe('Channel Mapping', function() {
  var mapping = {
    '#channel': '#otherchannel'
  };

  it('should fail when not given proper JSON', function() {
    process.env.CHANNEL_MAPPING = 'not json';
    function wrap() {
      validateChannelMapping();
    }
    (wrap).should.throw(ChannelMappingError, /Invalid channel mapping given/);
  });

  it('should fail without # in channels', function() {
    process.env.CHANNEL_MAPPING = JSON.stringify({ 'slack': 'irc' });
    function wrap() {
      validateChannelMapping();
    }
    (wrap).should.throw(ChannelMappingError, /Invalid channel mapping given/);
  });

  it('should not fail if given a proper channel list as JSON', function() {
    process.env.CHANNEL_MAPPING = JSON.stringify({ '#slack': '#irc' });
    function wrap() {
      validateChannelMapping();
    }
    (wrap).should.not.throw();
  });
});
