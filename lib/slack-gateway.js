var _ = require('lodash');
var logger = require('winston');
var request = require('superagent');

function SlackGateway(incomingURL, channelMapping) {
  this.incomingURL = incomingURL;
  this.invertedMapping = _.invert(channelMapping);
}

SlackGateway.prototype.sendToSlack = function(author, ircChannel, message) {
  var payload = {
    username: author,
    channel: this.invertedMapping[ircChannel],
    text: message
  };

  request
    .post(this.incomingURL)
    .send(payload)
    .set('Accept', 'application/json')
    .end(function(err, res) {
      if (err) return logger.error('Couldn\'t post message to Slack', err);
      logger.debug('Posted message to Slack', res.body, res.statusCode);
    });
};

module.exports = SlackGateway;
