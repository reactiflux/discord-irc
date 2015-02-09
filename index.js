var checkEnv = require('check-env');

checkEnv(['CONFIG_FILE']);

var app = require('./lib/server');
var logger = require('winston');

if (process.env.NODE_ENV !== 'production') {
  logger.level = 'debug';
}

app.listen(app.get('port'), function() {
  logger.debug('Listening on port %d', app.get('port'));
});
