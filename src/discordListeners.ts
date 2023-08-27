import { GuildChannel, Message } from 'npm:discord.js';
import Bot from './bot.ts';
import { escapeMarkdown } from './helpers.ts';

export function createDiscordReadyListener(bot: Bot) {
  return () => {
    bot.logger.info('Connected to Discord');
  };
}

export function createDiscordErrorListener(bot: Bot) {
  return (error: Error) => {
    bot.logger.error(
      `Received error event from Discord\n${JSON.stringify(error, null, 2)}`,
    );
  };
}

export function createDiscordWarningListener(bot: Bot) {
  return (warning: string) => {
    bot.logger.warn(
      `Received warn event from Discord\n${JSON.stringify(warning, null, 2)}`,
    );
  };
}

export function createDiscordMessageListener(bot: Bot) {
  return async (message: Message) => {
    // Show the IRC channel's /names list when asked for in Discord
    if (message.content.toLowerCase() === '/names') {
      const channelName = `#${(message.channel as GuildChannel)?.name}`;
      // return early if message was in channel we don't post to
      if (
        !(
          Object.keys(bot.channelMapping).find((c) => c === channelName) ||
          Object.keys(bot.channelMapping).find((c) => c === message.channelId)
        )
      ) {
        return;
      }
      const ircChannel = bot.channelMapping[message.channel.id] ||
        bot.channelMapping[channelName];
      if (bot.channelUsers[ircChannel]) {
        const ircNames = bot.channelUsers[ircChannel].values();
        const ircNamesArr = new Array(...ircNames);
        await bot.sendExactToDiscord(
          ircChannel,
          `Users in ${ircChannel}\n> ${
            ircNamesArr
              .map(escapeMarkdown) //TODO: Switch to discord.js escape markdown
              .join(', ')
          }`,
        );
      } else {
        bot.logger.warn(
          `No channelUsers found for ${ircChannel} when /names requested`,
        );
        // Pass the command through if channelUsers is empty
        await bot.sendToIRC(message);
      }
    } else {
      // Ignore bot messages and people leaving/joining
      await bot.sendToIRC(message);
    }
  };
}

export function createDiscordDebugListener(bot: Bot) {
  return (message: string) => {
    bot.debug &&
      bot.logger.debug(
        `Received debug event from Discord: ${
          JSON.stringify(message, null, 2)
        }`,
      );
  };
}
