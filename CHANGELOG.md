# Changelog
This project adheres to [Semantic Versioning](http://semver.org/).

## [3.0.0] - 2015-03-24
### Changed
Move from using outgoing/incoming integrations to Slack's
[bot users](https://api.slack.com/bot-users). See
[README.md](https://github.com/ekmartin/slack-irc/blob/master/README.md)
for a new example configuration. This mainly means slack-irc won't need
to listen on a port anymore, as it uses websockets to receive the messages
from Slack's [RTM API](https://api.slack.com/rtm).

To change from version 2 to 3, do the following:
- Create a new Slack bot user (under integrations)
- Add its token to your slack-irc config, and remove
the `outgoingToken` and `incomingURL` config options.

### Added
- Message formatting, follows Slack's [rules](https://api.slack.com/docs/formatting).

## [2.0.1]- 2015-03-03
### Added
- MIT License

## [2.0.0] - 2015-02-22
### Changed
- Post URL changed from `/send` to `/`.

## [1.1.0] - 2015-02-12
### Added
- Icons from [Adorable Avatars](http://avatars.adorable.io/).
- Command-line interface

### Changed
- Status code from 202 to 200.

## [1.0.0] - 2015-02-09
### Added
- Support for running multiple bots (on different Slacks)

### Changed
- New configuration format, example
[here](https://github.com/ekmartin/slack-irc/blob/44f6079b5da597cd091e8a3582e34617824e619e/README.md#configuration).

## [0.2.0] - 2015-02-06
### Added
- Add support for channel mapping.

### Changed
- Use winston for logging.
