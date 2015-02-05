var app = require('./lib/server');
var checkEnv = require('check-env');

checkEnv(
  ['IRC_SERVER', 'BOT_NICK', 'CHANNEL_MAPPING', 'INCOMING_HOOK_URL', 'OUTGOING_HOOK_TOKEN']
);

app.listen(app.get('port'), function() {
  console.log('listening on %d', app.get('port'));
});
