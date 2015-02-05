var app = require('./lib/server');

app.listen(app.get('port'), function() {
  console.log('listening on %d', app.get('port'));
});
