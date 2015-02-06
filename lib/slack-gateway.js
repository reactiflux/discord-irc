var _ = require('lodash');
var request = require('superagent');

function SlackGateway() {
  this.postURL = process.env.INCOMING_HOOK_URL;

  var channelMapping = JSON.parse(process.env.CHANNEL_MAPPING);
  this.invertedMapping = _.invert(channelMapping);
}

SlackGateway.prototype.sendToSlack = function(author, ircChannel, message) {
  var payload = {
    username: author,
    channel: this.invertedMapping[ircChannel],
    text: message
  };

  request
    .post(this.postURL)
    .send(payload)
    .set('Accept', 'application/json')
    .end(function(err, res) {
       // Needs better logging
      if (err) console.log('Error posting to Slack', err);
      console.log('Posted message to Slack', res.body, res.statusCode);
    });
};

module.exports = SlackGateway;
