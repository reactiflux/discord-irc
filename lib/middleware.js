exports.verifyToken = function(req, res, next) {
  var token = process.env.OUTGOING_HOOK_TOKEN;
  if (req.body.token === token) return next();

  res.status(403).json({
    text: 'Invalid hook token received',
    status: 403
  });
};

exports.ignoreBot = function(req, res, next) {
  var userId = req.body.user_id;
  if (userId === 'USLACKBOT') {
    return res.status(200).send();
  }
  return next();
};
