var request = require('superagent');

module.exports = function(author, channel, message) {
  var postURL = process.env.INCOMING_HOOK_URL;
  var payload = {
    username: author,
    channel: channel,
    text: message
  };

  request
    .post(postURL)
    .send(payload)
    .set('Accept', 'application/json')
    .end(function(err, res) {
       // Needs better logging
      if (err) console.log('Error posting to Slack', err);
      console.log('Posted message to Slack', res);
    });
};
