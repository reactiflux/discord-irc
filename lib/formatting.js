import ircFormatting from 'irc-formatting';
import SimpleMarkdown from 'simple-markdown';
import colors from 'irc-colors';
import _ from 'lodash';

function mdNodeToIRC(node) {
  let content = node.content;
  if (_.isArray(content)) content = content.map(mdNodeToIRC).join('');
  if (node.type === 'em') return colors.italic(content);
  if (node.type === 'strong') return colors.bold(content);
  if (node.type === 'u') return colors.underline(content);
  return content;
}

export function formatFromDiscordToIRC(text) {
  const markdownAST = SimpleMarkdown.defaultInlineParse(text);
  return markdownAST.map(mdNodeToIRC).join('');
}

export function formatFromIRCToDiscord(text) {
  const blocks = ircFormatting.parse(text);
  return blocks.map((block) => {
    let mdText = block.text;
    if (block.italic || block.reverse) mdText = `*${mdText}*`;
    if (block.bold) mdText = `**${mdText}**`;
    if (block.underline) mdText = `__${mdText}__`;
    return mdText;
  }).join('');
}
