# Changelog
This project adheres to [Semantic Versioning](http://semver.org/).

## [2.8.1] - 2020-03-16
### Fixed
* Large avatars failed to display when bridging through webhooks - (thanks to [Miosame](https://github.com/reactiflux/discord-irc/pull/511), follow up in [#530](https://github.com/reactiflux/discord-irc/pull/530))
* Update acorn to 7.1.1 - [#534](https://github.com/reactiflux/discord-irc/pull/534)
* Remove code coverage instrumentation from `dist/` files - [#536](https://github.com/reactiflux/discord-irc/pull/536)

## [2.8.0] - 2019-12-14
### Added
* `format.webhookAvatarURL`, to customize the unrecognized user webhook avatar (thanks to [Geo1088](https://github.com/reactiflux/discord-irc/pull/419))
* `parallelPingFix`, disabled by default, to prevent users of both Discord and IRC getting pings whenever their messages are mirrored to IRC (thanks to [qaisjp](https://github.com/reactiflux/discord-irc/pull/243) originally, follow up in [#502](https://github.com/reactiflux/discord-irc/pull/502) and [#520](https://github.com/reactiflux/discord-irc/pull/520))
* `ignoreUsers.discordIds`, to ignore specific Discord users through the bridge by ID instead of name (thanks to [nsavch](https://github.com/reactiflux/discord-irc/pull/508))
* A basic Docker image, found at [discordirc/discord-irc](https://hub.docker.com/r/discordirc/discord-irc)! This may not be often updated with the release tags we publish on GitHub, but it should contain a `latest` tag in addition to whichever Git hash is available on master (thanks to [gdude2002](https://github.com/reactiflux/discord-irc/pull/421), follow up in [#498](https://github.com/reactiflux/discord-irc/pull/498))

### Changed
* Add support for Node 13, drop testing for Node 6 - [#521](https://github.com/reactiflux/discord-irc/pull/521)

### Fixed
* Upgrade various dependencies: babel, commander, coveralls, discord.js, eslint, mocha, simple-markdown, sinon, sinon-chai - [#488](https://github.com/reactiflux/discord-irc/pull/488), [#503](https://github.com/reactiflux/discord-irc/pull/503), [#522](https://github.com/reactiflux/discord-irc/pull/522), [#523](https://github.com/reactiflux/discord-irc/pull/523), [#524](https://github.com/reactiflux/discord-irc/pull/524/files), [#525](https://github.com/reactiflux/discord-irc/pull/525)

## [2.7.2] - 2019-08-08
### Fixed
* Defer to discord permissions for allowing `@everyone` and `@here` in webhook messages - [#497](https://github.com/reactiflux/discord-irc/pull/497)
* Support Node 10 and 12 - [#499](https://github.com/reactiflux/discord-irc/pull/499)
* Upgrade dependencies
* Tests: Fix lint config deprecation - [#500](https://github.com/reactiflux/discord-irc/pull/500)
* Tests: Ensure all tests are run in dev environment - [#501](https://github.com/reactiflux/discord-irc/pull/501)

## [2.7.1] - 2019-06-15
### Changed
* Upgraded dependencies.

## [2.7.0] - 2019-04-02
### Changed
* Convert channel mentions to codified mentions (thanks to [Throne3d](https://github.com/reactiflux/discord-irc/pull/476)).
* Match IRC style mentions at the beginning of message (thanks to [rdb](https://github.com/reactiflux/discord-irc/pull/470)).
* Upgraded dependencies.

## [2.6.2] - 2018-09-19
### Changed
* Upgraded dependencies.

## [2.6.1] - 2018-05-11
### Changed
* Upgraded dependencies.

## [2.6.0] - 2018-03-22
### Added
* Support for posting messages to Discord using webhooks (thanks to
  [Fiaxhs](https://github.com/reactiflux/discord-irc/pull/230)!).

Webhooks lets you override nicknames and avatars, so messages coming from IRC
can appear as regular Discord messages:

![discord-webhook](http://i.imgur.com/lNeJIUI.jpg)

To enable webhooks, follow part 1 of [this
guide](https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks)
to create and retrieve a webhook URL for a specific channel, then enable it in
discord-irc's config as follows:

```json
  "webhooks": {
    "#discord-channel": "https://discordapp.com/api/webhooks/id/token"
  }
```

## [2.5.1] - 2018-01-18
### Fixed
* Upgraded dependencies.

## [2.5.0] - 2017-10-27
### Added
* Support multi-character command prefixes - [#301](https://github.com/reactiflux/discord-irc/pull/301)

* Enable auto-renicking by default, so the bot tries to get the target nickname after it fails - [#302](https://github.com/reactiflux/discord-irc/pull/302)

* Add the ability to ignore IRC/Discord users by nickname - [#322](https://github.com/reactiflux/discord-irc/pull/322)

### Fixed
* Improve IRC → Discord mentions around non-word characters and nickname prefix matches - [#273](https://github.com/reactiflux/discord-irc/pull/273)

* Default to UTF-8 encoding when bridging messages to prevent character corruption - [#315](https://github.com/reactiflux/discord-irc/pull/315)

* Fix a crash when using the bot in a group DM - [#316](https://github.com/reactiflux/discord-irc/pull/316)

* Use a `prepare` script for transpiling instead of `prepublish`, fixing `npm` installation direct from the GitHub repository - [#323](https://github.com/reactiflux/discord-irc/pull/323)

* Update dependencies:

  - discord.js to 11.2.1
  - sinon to ^4.0.1
  - irc-upd to 0.8.0 - [#313](https://github.com/reactiflux/discord-irc/pull/313)
  - simple-markdown to ^0.3.1
  - coveralls to ^3.0.0
  - mocha to ^4.0.0
  - winston to 2.4.0

### Changed
* Add a link to the IRC spec in the README - [#307](https://github.com/reactiflux/discord-irc/pull/307)

* Drop testing for Node 7, add testing for Node 8 - [#329](https://github.com/reactiflux/discord-irc/pull/329)

## [2.4.2] - 2017-08-21
### Fixed
* Tests: Use globbing instead of `find` so tests work on Windows - [#279](https://github.com/reactiflux/discord-irc/pull/279)

### Changed
* Update dependency irc-upd to [0.7.0](https://github.com/Throne3d/node-irc/releases/tag/v0.7.0) - [#284](https://github.com/reactiflux/discord-irc/pull/284)

* Tests: Use Discord objects to simplify code - [#272](https://github.com/reactiflux/discord-irc/pull/272)

## [2.4.1] - 2017-07-16
### Added
* Falsy command preludes are no longer sent (previously would choose default prelude) - [#260](https://github.com/reactiflux/discord-irc/pull/260)

### Fixed
* Update link to IRC library in README so it points to the new irc-upd library - [#264](https://github.com/reactiflux/discord-irc/pull/264)

* Update dependency commander to 2.11.0 - [#262](https://github.com/reactiflux/discord-irc/pull/262)

* Fix deprecation warning on `TextChannel#sendMessage` - [#267](https://github.com/reactiflux/discord-irc/pull/267)

* Fix reconnection by updating dependency irc-upd to 0.6.2 - [#270](https://github.com/reactiflux/discord-irc/pull/270)

## [2.4.0] - 2017-07-01
This project now uses [irc-upd](https://github.com/Throne3d/node-irc) as a dependency, instead of the old [irc](https://github.com/martynsmith/node-irc) package – this fork should be better maintained and will solve some bugs, detailed below.

### Added
* Allow commandCharacters to work for messages sent to Discord - [#221](https://github.com/reactiflux/discord-irc/pull/221).

* Send nick changes from IRC to Discord with `ircStatusNotices` - [#235](https://github.com/reactiflux/discord-irc/pull/235), [#241](https://github.com/reactiflux/discord-irc/pull/241).

* Translate custom emoji references from IRC to Discord - [#256](https://github.com/reactiflux/discord-irc/pull/256).

### Fixed
* Use `ircClient.nick` instead of `nickname` when checking if the `ircStatusNotices` event is for the bot, to prevent a potential crash - [#257](https://github.com/reactiflux/discord-irc/pull/257).

* Use the updated `irc-upd` library instead of `irc`, causing IRC messages to now be split by byte instead of character (fixing [#199](https://github.com/reactiflux/discord-irc/issues/199)) and adding support for certain Unicode characters in nicknames (fixing [#200](https://github.com/reactiflux/discord-irc/issues/200)) - [#258](https://github.com/reactiflux/discord-irc/pull/258).

* Update dependencies:

  - discord.js to 11.1.0
  - check-env to 1.3.0
  - chai to ^4.0.2
  - nyc to ^11.0.3
  - commander to 2.10.0
  - eslint to ^4.1.1

## [2.3.3] - 2017-04-29
### Fixed
* Warn if a part/quit is received and no channelUsers is set -
[#218](https://github.com/reactiflux/discord-irc/pull/218).

## [2.3.2] - 2017-04-27
### Fixed
* Fix ircStatucNotices when channels are not lowercase -
[#219](https://github.com/reactiflux/discord-irc/pull/219).

## [2.3.1] - 2017-04-05
### Fixed
* Fix IRC quit messages sending to all channels by tracking users - [#214](https://github.com/reactiflux/discord-irc/pull/214#pullrequestreview-31156291).

## [2.3.0] - 2017-04-03
A huge thank you to [@Throne3d](https://github.com/Throne3d),
[@rahatarmanahmed](https://github.com/rahatarmanahmed), [@mraof](https://github.com/mraof)
and [@Ratismal](https://github.com/Ratismal) for all the fixes and features
in this release.

### Added
* Bridge IRC join/part/quit messages to Discord
(enable by setting ircStatusNotices to true) -
[#207](https://github.com/reactiflux/discord-irc/pull/207).

* Convert text styles between IRC and Discord
[#205](https://github.com/reactiflux/discord-irc/pull/205).

* Allow users to configure the patterns of messages on
IRC and Discord using the format options object
[#204](https://github.com/reactiflux/discord-irc/pull/204).

* Add Discord channel ID matching  to the channel mapping
[#202](https://github.com/reactiflux/discord-irc/pull/202).

### Fixed
* Parse role mentions appropriately, as with channel and user mentions
[#203](https://github.com/reactiflux/discord-irc/pull/203).

* Make the bot not crash when a channel mentioned by ID fails to exist
[#201](https://github.com/reactiflux/discord-irc/pull/201).

### Changed
* Convert username mentions even if nickname is set -
[#208](https://github.com/reactiflux/discord-irc/pull/208).

## [2.2.1] - 2017-03-12
### Fixed
* Reverts the changes in 2.2.0 due to incompatibilities with different clients.
See https://github.com/reactiflux/discord-irc/issues/196 for more
information.

## [2.2.0] - 2017-03-06
### Fixed
* Added a zero width character between each letter of the IRC nicknames, to
avoid unwanted highlights. Fixed by @Sanqui in
[#193](https://github.com/reactiflux/discord-irc/pull/193).

## [2.1.6] - 2017-01-10
### Fixed
* Upgraded discord.js.

## [2.1.6] - 2016-12-08
### Fixed
* Listen to warn events from Discord.
* Listen to debug events from Discord (only in development).
* Log info events upon connection, instead of debug

## [2.1.5] - 2016-11-17
### Fixed
* Upgraded node-irc to 0.5.1, fixing #129.

## [2.1.4] - 2016-11-14
### Fixed
* Added support for highlighting users by their nicknames,
thanks to @DarkSpyro003.
* Upgraded to discord.js v10.

## [2.1.3] - 2016-11-02
### Fixed
* Send text messages only to text channels (thanks @dustinlacewell).

## [2.1.2] - 2016-11-01
### Fixed
* Use nickname, not username, in command prelude.
Thanks to @williamjacksn.

## [2.1.1] - 2016-10-21
### Fixed
* A bug where Discord attachment URLs weren't posted to IRC, thanks to @LordAlderaan for the report.

## [2.1.0] - 2016-10-09
### Added
* Messages sent to IRC will now use the correct server nickname,
instead of the user's global username (thanks to @DarkSpyro003).

## [2.0.2] - 2016-10-02
### Fixed
- Display custom emojis correctly, thanks to @macdja38.

## [2.0.0] - 2016-09-25
### Fixed
- Upgrade to version 9.3 of discord.js.
This removes support for Node.js versions older than v6,
as that's the oldest discord.js supports.

## [1.0.3] - 2016-09-09
### Fixed
- Replace changes in 1.0.2 with the #indev-old version
of discord.js.

## [1.0.2] - 2016-09-09
### Fixed
- Discord's API now requires bot tokens
to be prefixed with "Bot". This adds
a hotfix that does exactly that.

## [1.0.1] - 2016-06-19
### Fixed
- Upgraded dependencies.

## [1.0.0] - 2016-05-06
### Changed
- Breaking: discord-irc now uses tokens for authentication, instead of
email/password, thanks to @TheDoctorsLife. See the README for more instructions.

## [0.8.2] - 2016-04-21
### Fixed
- Enable auto reconnect for IRC and Discord.

## [0.8.1] - 2016-04-21
### Fixed
- Upgrade discord.js to 7.0.1.

## [0.8.0] - 2016-04-04
Implemented by @rce:
### Added
- Support for messages containing both attachments and text.

### Changed
- Attachment URLs are now posted by themselves, instead of including a
preliminary message explaining that it's an attachment.

## [0.7.0] - 2016-04-04
### Added
- Added the config option `ircNickColor` to make it possible to
disable nick colors for messages sent to IRC.

## [0.6.1] - 2016-04-04
### Fixed
- Upgrade dependencies.

## [0.6.0] - 2016-02-24
### Added
- Highlight Discord users when they're mentioned on IRC (thanks to @rce).

## [0.5.0] - 2016-02-08
### Added
- Discord attachments will be linked to on IRC when
they're posted (fixed by @rce).

## [0.4.3] - 2016-01-23
### Fixed
- Upgraded dependencies.
- istanbul -> nyc for coverage.

## [0.4.1] - 2015-12-22
### Changed
- Comments are now stripped from JSON configs before they're parsed.
- Upgraded dependencies.

## [0.4.0] - 2015-11-11
### Added
- Colors to IRC nicks.

## [0.3.0] - 2015-10-28
### Changed
- Rewrote everything to ES6.

## [0.2.0] - 2015-10-28
### Added
- Support for channel and username highlights from Discord to IRC.
This means that e.g. #general will no longer result in something like #512312.

### Added
- Working tests for all functionality.

## [0.1.1] - 2015-10-27
### Changed
- Made `discord.irc` a regular dependency, instead of a devDependency.

## [0.1.0] - 2015-10-13
### Added
- Initial implementation.
