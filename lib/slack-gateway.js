var _ = require('lodash');
var request = require('superagent');
var errors = require('./errors');
var channelMapping = require('./channel-mapping');

function SlackGateway() {
  this.postURL = process.env.INCOMING_HOOK_URL;
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
      console.log('Posted message to Slack', res);
    });
};

