import ircFormatting from 'npm:irc-formatting@1.0.0-rc3';
import SimpleMarkdown from 'npm:simple-markdown';
import colors from 'npm:irc-colors';
import { GameLogConfig } from './config.ts';

function mdNodeToIRC(node: any) {
  let { content } = node;
  if (Array.isArray(content)) content = content.map(mdNodeToIRC).join('');
  switch (node.type) {
    case 'em':
      return colors.italic(content);
    case 'strong':
      return colors.bold(content);
    case 'u':
      return colors.underline(content);
    default:
      return content;
  }
}

export function formatFromDiscordToIRC(text: any) {
  const markdownAST = SimpleMarkdown.defaultInlineParse(text);
  return markdownAST.map(mdNodeToIRC).join('');
}

function applyFormattingRules(
  text: string,
  ircUser: string,
  config?: GameLogConfig,
): { text: string; needColorFormat: boolean } {
  let mdText = '';
  let colorize = false;

  if (!config) return { text: mdText, needColorFormat: colorize };

  for (const pattern of config.patterns) {
    if (pattern.user.toLowerCase() !== ircUser.toLowerCase()) continue;
    for (const value of Object.values(pattern.matches)) {
      const regex = new RegExp(value.regex);
      if (regex.test(text)) {
        mdText += '```ansi\n';
        mdText += `\u{001b}[${value.color}m`;
        colorize = true;
        break;
      }
    }
  }

  return { text: mdText, needColorFormat: colorize };
}

export function formatFromIRCToDiscord(
  text: any,
  ircUser: string,
  config?: GameLogConfig,
) {
  const formattedText = applyFormattingRules(text, ircUser, config);
  let mdText = '';

  if (formattedText.needColorFormat) {
    mdText = formattedText.text + text;
    mdText += '\n```';
    return mdText;
  }

  const blocks = ircFormatting.parse(text).map((block: any) => ({
    // Consider reverse as italic, some IRC clients use that
    ...block,
    italic: block.italic || block.reverse,
  }));

  for (let i = 0; i <= blocks.length; i += 1) {
    // Default to unstyled blocks when index out of range
    const block = blocks[i] || {};
    const prevBlock = blocks[i - 1] || {};

    // Add start markers when style turns from false to true
    if (!prevBlock.italic && block.italic) mdText += '*';
    if (!prevBlock.bold && block.bold) mdText += '**';
    if (!prevBlock.underline && block.underline) mdText += '__';

    // Add end markers when style turns from true to false
    // (and apply in reverse order to maintain nesting)
    if (prevBlock.underline && !block.underline) mdText += '__';
    if (prevBlock.bold && !block.bold) mdText += '**';
    if (prevBlock.italic && !block.italic) mdText += '*';

    mdText += block.text || '';
  }

  return mdText;
}
