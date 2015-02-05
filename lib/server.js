var express = require('express');
var bodyParser = require('body-parser');
var middleware = require('./middleware');
var Bot = require('./irc');
var errors = require('./errors');

var verifyToken = middleware.verifyToken;
var ignoreBot = middleware.ignoreBot;
var app = express();

// Make sure the channel mapping is given as proper JSON
try {
  JSON.parse(process.env.CHANNEL_MAPPING);
} catch(e) {
  throw new errors.ChannelMappingError();
}

var bot = new Bot();

app.set('CHANNEL_MAPPING', JSON.parsek)
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({
  extended: true
}));

app.post('/send', verifyToken, ignoreBot, function(req, res) {
  var channel = req.body.channel_name;
  var author = req.body.user_name;
  var message = req.body.text;

  bot.sendMessage(author, channel, message);
  res.status(202).send();
});

module.exports = app;
