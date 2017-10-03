# discord-irc [![Build Status](https://travis-ci.org/reactiflux/discord-irc.svg?branch=master)](https://travis-ci.org/reactiflux/discord-irc) [![Coverage Status](https://coveralls.io/repos/github/reactiflux/discord-irc/badge.svg?branch=master)](https://coveralls.io/github/reactiflux/discord-irc?branch=master)

> Connects [Discord](https://discordapp.com/) and [IRC](https://www.ietf.org/rfc/rfc1459.txt) channels by sending messages back and forth.

## Example
![discord-irc](http://i.imgur.com/oI6iCrf.gif)

## Installation and usage
**Note**: discord-irc requires Node.js version 6 or newer, as it depends on [discord.js](https://github.com/hydrabolt/discord.js).

Before you can run discord-irc you need to create a configuration file by
following the instructions [here](https://github.com/reactiflux/discord-irc#configuration).
After you've done that you can replace `/path/to/config.json` in the commands
below with the path to your newly created configuration file - or just `config.json` if it's
in the same directory as the one you're starting the bot from.

When you've done that you can install and start the bot either through npm:

```bash
$ npm install -g discord-irc
$ discord-irc --config /path/to/config.json
```

or by cloning the repository:

```bash
In the repository folder:
$ npm install
$ npm run build
$ npm start -- --config /path/to/config.json # Note the extra double dash
```

It can also be used as a module:
```js
import discordIRC from 'discord-irc';
import config from './config.json';
discordIRC(config);
```

When installing the library, you may encounter an error relating to the installation of `iconv` or `node-icu-charset-detector`.
These are optional dependencies which allow you to set the target encoding of messages sent to Discord, as detailed below in the README.
Without these dependencies and the relevant setting, messages that aren't sent in UTF-8 may be corrupted when copied to Discord.

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
      "#discord": "#irc channel-password", // Add channel keys after the channel name
      "1234567890": "#channel" // Use a discord channel ID instead of its name (so you can rename it or to disambiguate)
    },
    "ircOptions": { // Optional node-irc options
      "floodProtection": false, // On by default
      "floodProtectionDelay": 1000 // 500 by default
    },
    "format": { // Optional custom formatting options
      // Patterns, represented by {$patternName}, are replaced when sending messages
      "commandPrelude": "Command sent by {$nickname}", // Message sent before a command
      "ircText": "<{$displayUsername}> {$text}", // When sending a message to IRC
      "urlAttachment": "<{$displayUsername}> {$attachmentURL}", // When sending a Discord attachment to IRC
      "discord": "**<{$author}>** {$withMentions}" // When sending a message to Discord
      // Other patterns that can be used:
      // {$discordChannel} (e.g. #general)
      // {$ircChannel} (e.g. #irc)
    },
    "ircNickColor": false, // Gives usernames a color in IRC for better readability (on by default)
    // Makes the bot hide the username prefix for messages that start
    // with one of these characters (commands):
    "commandCharacters": ["!", "."],
    "ircStatusNotices": true // Enables notifications in Discord when people join/part in the relevant IRC channel
    "ircIgnoreUsers": ["user_nick1", "user_nick2"] // Ignore specified IRC nicks and do not send their messages to Discord.
  }
]
```

The `ircOptions` object is passed directly to irc-upd ([available options](https://node-irc-upd.readthedocs.io/en/latest/API.html#irc.Client)).

To retrieve a discord channel ID, write `\#channel` on the relevant server – it should produce something of the form `<#1234567890>`, which you can then use in the `channelMapping` config.

### Encodings

If you encounter trouble with some characters being corrupted from some clients (particularly umlauted characters, such as `ä` or `ö`), try installing the optional dependencies `iconv` and `node-icu-charset-detector`.
The bot will produce a warning when started if the IRC library is unable to convert between encodings.

Further information can be found in [the installation section of irc-upd](https://github.com/Throne3d/node-irc#character-set-detection).

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
