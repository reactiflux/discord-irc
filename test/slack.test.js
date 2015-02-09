var chai = require('chai');
var nock = require('nock');
var SlackGateway = require('../lib/slack-gateway');
var testConfig = require('./test-config.json');

chai.should();

describe('Slack Gateway', function() {
  var baseURL = 'http://slack.com';

  var user = 'user';
  var channel = '#irc';
  var message = 'message';

  before(function() {
    this.slackMock = nock(baseURL)
      .post('/hook', {
        username: user,
        channel: '#slack',
        text: message
      })
      .reply(200);

    var config = testConfig[0];
    this.slackGateway = new SlackGateway(config.incomingURL, config.channelMapping);
  });

  it('should invert the channel mapping', function() {
    this.slackGateway.invertedMapping['#irc'].should.equal('#slack');
  });

  it('should try to post messages to slack', function() {
    this.slackGateway.sendToSlack(user, channel, message);
    this.slackMock.isDone().should.equal(true);
  });
});
