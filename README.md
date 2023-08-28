[![Coverage Status](https://coveralls.io/repos/github/reactiflux/discord-irc/badge.svg?branch=main)](https://coveralls.io/github/reactiflux/discord-irc?branch=main)

> Connects [Discord](https://discord.com/) and [IRC](https://www.ietf.org/rfc/rfc1459.txt) channels by sending messages back and forth.

## Example

![discord-irc](http://i.imgur.com/oI6iCrf.gif)

## Installation and usage

Before you can run discord-irc you need to create a configuration file by
following the instructions [here](https://github.com/aronson/discord-irc#configuration).
Place config.json in the same directory as the cloned sources.

### Native builds (easiest)
Start the bot by downloading the [latest release](https://github.com/aronson/discord-irc/releases) for your platform.

Windows:
```batch
.\discord-irc-windows-x86_64.exe -c C:\Path\To\config.json
```

Linux/macOS (make sure to replace the name of the program file with the one you downloaded):
```bash
## Linux
./discord-irc-linux-x86_64 -c /path/to/config.json
## Apple users may need to mark as executable and disable quarantine before running
chmod +x ./discord-irc-apple-*
xattr -c ./discord-irc-apple-*
./discord-irc-apple-* -c /path/to/config.json
```

### Running with Deno (developers)
For *development* work, discord-irc requires Deno, as it depends on [Harmony](https://harmony.mod.land).
Please see the [official install instructions](https://deno.land/manual/getting_started/installation) to install Deno for your platform.

```bash
## Clone the repo
git clone https://github.com/aronson/discord-irc.git
## copy your config.json in
cp /path/to/config.json discord-irc
## Enter source directory
cd discord-irc
## Start with deno.
deno task start

## For custom path
CONFIG_FILE=/path/to/config.json deno task start
```

It can also be used as a module:

```js
import discordIRC from 'discord-irc';
import config from './config.json';
discordIRC(config);
```

### Docker

As an alternative to running discord-irc directly on your machine, we provide a Docker container image.
After creating a configuration file, you can fetch the image from Docker Hub and run it with the following command:

```bash
docker run -v /path/to/config.json:/app/config.json ghcr.io/aronson/discord-irc
```

If you've checked out the repository already, you can build the Docker image locally and run that instead:

```bash
docker build -t discord-irc .
docker run -v /path/to/config.json:/app/config.json discord-irc
```

Note that the path to the config file on the host (`/path/to/`) _must_ be a valid absolute path to a config file.
Otherwise, you may get the error "illegal operation on a directory".

## Configuration

First you need to create a Discord bot user, which you can do by following the instructions [here](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token).

### Example configuration

```js
[
  // Bot 1 (minimal configuration):
  {
    nickname: 'test2',
    server: 'irc.testbot.org',
    discordToken: 'botwantsin123',
    channelMapping: {
      '#other-discord': '#new-irc-channel',
    },
  },

  // Bot 2 (advanced options):
  {
    nickname: 'test',
    server: 'irc.bottest.org',
    discordToken: 'botwantsin123',
    autoSendCommands: [
      // Commands that will be sent on connect
      ['PRIVMSG', 'NickServ', 'IDENTIFY password'],
      ['MODE', 'test', '+x'],
      ['AUTH', 'test', 'password'],
    ],
    channelMapping: {
      // Maps each Discord-channel to an IRC-channel, used to direct messages to the correct place
      '#discord': '#irc channel-password', // Add channel keys after the channel name
      1234567890: '#channel', // Use a discord channel ID instead of its name (so you can rename it or to disambiguate)
    },
    ircOptions: {
      // Deno/irc options, see https://github.com/jeromeludmann/deno-irc/blob/main/API.md#options
      username: 'test',
      password: 'p455w0rd'
    },
    format: {
      // Optional custom formatting options
      // Patterns, represented by {$patternName}, are replaced when sending messages
      commandPrelude: 'Command sent by {$nickname}', // Message sent before a command
      ircText: '<{$displayUsername}> {$text}', // When sending a message to IRC
      urlAttachment: '<{$displayUsername}> {$attachmentURL}', // When sending a Discord attachment to IRC
      discord: '**<{$author}>** {$withMentions}', // When sending a message to Discord
      // Other patterns that can be used:
      // {$discordChannel} (e.g. #general)
      // {$ircChannel} (e.g. #irc)
      webhookAvatarURL: 'https://robohash.org/{$nickname}', // Default avatar to use for webhook messages
    },
    ircNickColor: false, // Gives usernames a color in IRC for better readability (on by default)
    ircNickColors: [
      'light_blue',
      'dark_blue',
      'light_red',
      'dark_red',
      'light_green',
      'dark_green',
      'magenta',
      'light_magenta',
      'orange',
      'yellow',
      'cyan',
      'light_cyan',
    ], // Which irc-upd colors to use
    parallelPingFix: true, // Prevents users of both IRC and Discord from being mentioned in IRC when they speak in Discord (off by default)
    // Makes the bot hide the username prefix for messages that start
    // with one of these characters (commands):
    commandCharacters: ['!', '.'],
    ircStatusNotices: true, // Enables notifications in Discord when people join/part in the relevant IRC channel
    ignoreUsers: {
      irc: ['irc_nick1', 'irc_nick2'], // Ignore specified IRC nicks and do not send their messages to Discord.
      discord: ['discord_nick1', 'discord_nick2'], // Ignore specified Discord nicks and do not send their messages to IRC.
      discordIds: ['198528216523210752'], // Ignore specified Discord ids and do not send their messages to IRC.
    },
    // List of webhooks per channel
    webhooks: {
      '#discord': 'https://discord.com/api/webhooks/id/token',
    },
  },
];
```

The `ircOptions` object is passed directly to deno/irc ([available options](https://github.com/jeromeludmann/deno-irc/blob/main/API.md#options)).

To retrieve a discord channel ID, write `\#channel` on the relevant server – it should produce something of the form `<#1234567890>`, which you can then use in the `channelMapping` config.

### Webhooks

Webhooks lets you override nicknames and avatars, so messages coming from IRC
can appear as regular Discord messages:

![discord-webhook](http://i.imgur.com/lNeJIUI.jpg)

To enable webhooks, follow part 1 of [this
guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
to create and retrieve a webhook URL for a specific channel, then enable it in
discord-irc's config as follows:

```json
  "webhooks": {
    "#discord-channel": "https://discord.com/api/webhooks/id/token"
  }
```

## Tests (TODO)

Run the tests with:

```bash
deno test
```

## Style Guide

discord-irc follows the deno standard styles with some tweaks.
Please use `deno lint` and `deno fmt` to make sure this is followed correctly.
