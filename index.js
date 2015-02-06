var app = require('./lib/server');
var logger = require('winston');
var checkEnv = require('check-env');

checkEnv(
  ['IRC_SERVER', 'BOT_NICK', 'CHANNEL_MAPPING', 'INCOMING_HOOK_URL', 'OUTGOING_HOOK_TOKEN']
);

if (process.env.NODE_ENV !== 'production') {
  logger.level = 'debug';
}

app.listen(app.get('port'), function() {
  logger.debug('Listening on port %d', app.get('port'));
});
