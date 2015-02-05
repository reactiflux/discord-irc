var chai = require('chai');
var ChannelMappingError = require('../lib/errors').ChannelMappingError;
var validateChannelMapping = require('../lib/helpers').validateChannelMapping;
chai.should();

describe('Channel Mapping', function() {
  var mapping = {
    '#channel': '#otherchannel'
  };

  it('should fail if env var CHANNEL_MAPPING isn\'t JSON', function() {
    process.env.CHANNEL_MAPPING = 'not json';
    function bad() {
      validateChannelMapping();
    }
    (bad).should.throw(ChannelMappingError, /Invalid channel mapping given/);
  });
});
