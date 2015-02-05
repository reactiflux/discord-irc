var express = require('express');
var bodyParser = require('body-parser');
var middleware = require('./middleware');
var verifyToken = middleware.verifyToken;
var ignoreBot = middleware.ignoreBot;

var Bot = require('./irc');

var app = module.exports = express();
var bot = new Bot();

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
