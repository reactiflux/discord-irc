var chai = require('chai');
var SlackGateway = require('../lib/slack-gateway');
chai.should();

describe('Slack Gateway', function() {
  var channelMapping = {
    '#slack': '#irc'
  };

  before(function() {
    process.env.CHANNEL_MAPPING = JSON.stringify(channelMapping);
    this.slackGateway = new SlackGateway();
  });

  it('should invert the channel mapping', function() {
    this.slackGateway.invertedMapping['#irc'].should.equal('#slack');
  });
});
