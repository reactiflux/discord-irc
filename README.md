# discord-irc [![Build status](https://ci.frigg.io/badges/reactiflux/discord-irc/)](https://ci.frigg.io/reactiflux/discord-irc/last/) [![Coverage status](https://ci.frigg.io/badges/coverage/reactiflux/discord-irc/)](https://ci.frigg.io/reactiflux/discord-irc/last/)

> Connects [Discord](https://discordapp.com/) and IRC channels by sending messages back and forth.

A mostly feature complete port of [slack-irc](https://github.com/ekmartin/slack-irc).

## Example
![discord-irc](http://i.imgur.com/oI6iCrf.gif)

## Installation and usage
Either by installing through npm:
```bash
$ npm install -g discord-irc
$ discord-irc --config /path/to/config.json
```

or by cloning the repository:

```bash
In the repository folder:
$ npm install
$ npm start -- --config /path/to/config.json # Note the extra double dash
```

It can also be used as a module:
```js
import discordIRC from 'discord-irc';
import config from './config.json';
discordIRC(config);
```

## Configuration
First you need to create a Discord bot user, which you can do by following the instructions [here](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token).

### Example configuration
```js
[
  // Bot 1 (minimal configuration):
  {
    "nickname": "test2",
    "server": "irc.testbot.org",
    "discordToken": "botwantsin123",
    "channelMapping": {
      "#other-discord": "#new-irc-channel"
    }
  },

  // Bot 2 (advanced options):
  {
    "nickname": "test",
    "server": "irc.bottest.org",
    "discordToken": "botwantsin123",
    "autoSendCommands": [ // Commands that will be sent on connect
      ["PRIVMSG", "NickServ", "IDENTIFY password"],
      ["MODE", "test", "+x"],
      ["AUTH", "test", "password"]
    ],
    "channelMapping": { // Maps each Discord-channel to an IRC-channel, used to direct messages to the correct place
      "#discord": "#irc channel-password" // Add channel keys after the channel name
    },
    "ircOptions": { // Optional node-irc options
      "floodProtection": false, // On by default
      "floodProtectionDelay": 1000 // 500 by default
    },
    "ircNickColor": false, // Gives usernames a color in IRC for better readability (on by default)
    // Makes the bot hide the username prefix for messages that start
    // with one of these characters (commands):
    "commandCharacters": ["!", "."]
  }
]
```

The `ircOptions` object is passed directly to node-irc ([available options](http://node-irc.readthedocs.org/en/latest/API.html#irc.Client)).

## Tests
Run the tests with:
```bash
$ npm test
```

## Style Guide
discord-irc follows the [Airbnb Style Guide](https://github.com/airbnb/javascript).
[ESLint](http://eslint.org/) is used to make sure this is followed correctly, which can be run with:

```bash
$ npm run lint
```

## License

(The MIT License)

Copyright (c) 2016 Martin Ek <mail@ekmartin.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
