var express = require('express');
var bodyParser = require('body-parser');
var middleware = require('./middleware');
var createBots = require('./helpers').createBots;
var setBot = middleware.setBot;
var ignoreSlackBot = middleware.ignoreSlackBot;

var app = express();

var bots = createBots();
app.set('bots', bots);
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({
  extended: true
}));

app.post('/', ignoreSlackBot, setBot, function(req, res) {
  var channel = req.body.channel_name;
  var author = req.body.user_name;
  var message = req.body.text;

  req.bot.sendMessage(author, channel, message);
  res.status(200).send();
});

module.exports = app;
