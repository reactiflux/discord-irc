# Desired changes for discord-irc development

This document tracks upcoming and in-progress changes for the discord-irc project.

These are worked on in no particular order and not guaranteed to be completed.

## Todo

- [ ] Add annotated documentation to exported types
- [ ] Improve API surface for modular extension or plugin system
  - [ ] Investigate plugin system viability
  - [ ] Document exported types with annotations
- [ ] Support unicode emoji within mentions from IRC -> Discord
- [ ] Implement unit tests
  - [ ] Investigate upstream project's testing surface
  - [ ] Port unit tests to `deno test`

## In Progress

- [ ] Add optional emoji filter for Discord -> IRC names
- [ ] Improve config.json parsing/validation for ircOptions
- [ ] Support `username:` mention format from IRC -> Discord names

## Done ✓

- [x] Create TODO.md
