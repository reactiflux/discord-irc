# slack-irc [![Build status](https://ci.frigg.io/badges/ekmartin/slack-irc/)](https://ci.frigg.io/ekmartin/slack-irc/last/) [![Coverage status](https://ci.frigg.io/badges/coverage/ekmartin/slack-irc/)](https://ci.frigg.io/ekmartin/slack-irc/last/)

> Connects Slack and IRC channels by sending messages back and forth.

## Demo
![Slack IRC](http://i.imgur.com/XGVXY6n.gif)

## Installation and usage
Either by installing through npm:
```bash
$ npm install -g slack-irc
$ slack-irc --config path/to/config.json
```

or by cloning the repository:

```bash
In the repository folder:
$ npm install
$ npm start
```

## Configuration

You will have to set up an [outgoing webhook integration](https://api.slack.com/outgoing-webhooks) for each channel you want to connect to an IRC-channel, pointing at the URL of your slack-irc instance. You only need one [incoming integration](https://api.slack.com/incoming-webhooks), as slack-irc will supply the channel itself.

slack-irc requires a JSON-configuration file, whose path can be given either through the CLI-option `--config` or the environment variable `CONFIG_FILE`. The configuration file needs to be an object or an array, depending on the number of IRC bots you want to run.

This allows you to use one instance of slack-irc for multiple Slack teams if wanted, even if the IRC channels are on different networks.

Example configuration:
```js
[
  {
    "nickname": "test",
    "server": "irc.bottest.org",
    "incomingURL": "http://slack.com/hook", // Incoming hook URL from Slack
    "outgoingToken": "test", // Outgoing hook token from Slack
    "autoSendCommands": [ // Commands that will be sent on connect
        ["MODE", "test", "+x"],
        ["AUTH", "test", "password"]
    ],
    "channelMapping": { // Maps each Slack-channel to an IRC-channel, used to direct messages to the correct place
      "#slack": "#irc"
    }
  },
  {
    "nickname": "test2",
    "server": "irc.testbot.org",
    "incomingURL": "http://slack.com/hook/differenthook",
    "outgoingToken": "other test",
    "channelMapping": {
      "#other-slack": "#new-irc-channel"
    }
  }
]
```

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
