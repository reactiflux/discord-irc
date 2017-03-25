import ircFormatting from 'irc-formatting';

export function formatFromDiscordToIRC(text) {
  return text
    .replace(/~~(.*?)~~/g, '$1')                        // Remove unsupported strikethrough
    .replace(/__(.*?)__/g, '\u001F$1\u000F')                         // Apply underline
    .replace(/\*\*(.*?)\*\*/g, '\u0002$1\u000F')                     // Apply bold
    .replace(/\*(.*?)\*/g, '\u001D$1\u000F')                         // Apply italics
    .replace(/_(.*?)_/g, '\u001D$1\u000F');                          // Apply alternate italics
}

export function formatFromIRCToDiscord(text) {
  const blocks = ircFormatting.parse(text);
  return blocks.map((block) => {
    let mdText = block.text;
    if (block.italic) mdText = `*${mdText}*`;
    if (block.bold) mdText = `**${mdText}**`;
    if (block.underline) mdText = `__${mdText}__`;
    return mdText;
  }).join('');
}
