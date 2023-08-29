import { ClientOptions } from './deps.ts';
import { Dictionary } from './helpers.ts';

export type Format = {
  ircText?: string;
  discord?: string;
  urlAttachment?: string;
  commandPrelude?: string;
  webhookAvatarURL?: string;
};

export type IgnoreUsers = {
  irc: string[];
  discord: string[];
  discordIds: string[];
};

export type GameLogConfig = {
  patterns: {
    user: string;
    matches: {
      regex: string;
      color: string;
    }[];
  }[];
};

export type IgnoreConfig = {
  ignorePatterns: Dictionary<string[]>[];
};

export type Config = {
  server: string;
  nickname: string;
  discordToken: string;
  channelMapping: Dictionary<string>;
  ircOptions?: Partial<ClientOptions>;
  commandCharacters?: string[];
  ircNickColor?: boolean;
  ircNickColors?: string[];
  parallelPingFix?: boolean;
  ircStatusNotices?: boolean;
  announceSelfJoin?: boolean;
  webhooks?: Dictionary<string>;
  ignoreUsers?: IgnoreUsers;
  gameLogConfig?: GameLogConfig;
  ignoreConfig?: IgnoreConfig;
  // "{$keyName}" => "variableValue"
  // author/nickname: nickname of the user who sent the message
  // discordChannel: Discord channel (e.g. #general)
  // ircChannel: IRC channel (e.g. #irc)
  // text: the (appropriately formatted) message content
  format?: Format;
  autoSendCommands?: [any, string][];
  allowRolePings?: boolean;
};
