var _ = require('lodash');

exports.setBot = function(req, res, next) {
  var bot = _.find(req.app.get('bots'), { outgoingToken: req.body.token });
  if (bot) {
    req.bot = bot;
    return next();
  }

  res.status(403).json({
    text: 'Invalid hook token received',
    status: 403
  });
};

exports.ignoreSlackBot = function(req, res, next) {
  var userId = req.body.user_id;
  if (userId === 'USLACKBOT') {
    return res.status(200).send();
  }
  return next();
};
