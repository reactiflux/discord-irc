var chai = require('chai');
var nock = require('nock');
var SlackGateway = require('../lib/slack-gateway');
chai.should();

describe('Slack Gateway', function() {
  var channelMapping = {
    '#slack': '#irc'
  };

  var baseURL = 'http://slack.com';

  var user = 'user';
  var channel = '#irc';
  var message = 'message';

  before(function() {
    process.env.CHANNEL_MAPPING = JSON.stringify(channelMapping);
    process.env.INCOMING_HOOK_URL = baseURL + '/hook';
    this.slackMock = nock(baseURL)
      .post('/hook', {
        username: user,
        channel: '#slack',
        text: message
      })
      .reply(200);

    this.slackGateway = new SlackGateway();
  });

  it('should invert the channel mapping', function() {
    this.slackGateway.invertedMapping['#irc'].should.equal('#slack');
  });

  it('should try to post messages to slack', function() {
    this.slackGateway.sendToSlack(user, channel, message);
    this.slackMock.isDone().should.equal(true);
  });
});
