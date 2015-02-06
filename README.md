# slack-irc [![Build status](https://ci.frigg.io/badges/ekmartin/slack-irc/)](https://ci.frigg.io/ekmartin/slack-irc/last/) [![Coverage status](https://ci.frigg.io/badges/coverage/ekmartin/slack-irc/)](https://ci.frigg.io/ekmartin/slack-irc/last/)

> Connects Slack and IRC channels by sending messages back and forth.

## Demo
![Slack IRC](http://i.imgur.com/XGVXY6n.gif)
## Installation
```bash
In the repository folder:
$ npm install
```

## Configuration

You will have to set up an [outgoing webhook integration](https://api.slack.com/outgoing-webhooks) for each channel you want to connect to an IRC-channel. You only need one [incoming integration](https://api.slack.com/incoming-webhooks), as slack-irc will supply the channel itself.

slack-irc uses environment variables for configuration. Required environment variables are:
```bash
export IRC_SERVER='irc.freenode.net'
export BOT_NICK='SlackIRC' # IRC Nick
export OUTGOING_HOOK_TOKEN='Hook token from the Slack outgoing integration'
export INCOMING_HOOK_URL='Hook URL from the Slack incoming integration'
export CHANNEL_MAPPING='{
    "#slack-channel": "#irc-channel",
    "#other-slack-channel": "#other-irc-channel"
}'
```
If you put these in a `.environment`-file or similar, you can do `source .environment` to expose the variables before starting the server.
The channel mapping is used to connect each Slack channel with an IRC channel.

The server can then be started with `npm start`.

## Tests
Run the tests with:
```bash
$ make test
```

## License

(The MIT License)

Copyright (c) 2015 Martin Ek <mail@ekmartin.no>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
