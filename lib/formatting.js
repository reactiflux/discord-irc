/* eslint-disable no-unused-vars */

export function formatFromDiscordToIRC(text) {
  // Apply formatting rules, from most specific to least specific.
  return text.replace(/~~(.*?)~~/g, '$1')                        // Remove unsupported strikethrough
    .replace(/__\*\*\*(.*?)\*\*\*__/g, '\u001F\u001D\u0002$1\u000F') // Apply underline-italics-bold
    .replace(/__\*\*(.*?)\*\*__/g, '\u001F\u0002$1\u000F')           // Apply underline-bold
    .replace(/__\*(.*?)\*__/g, '\u001F\u001D$1\u000F')               // Apply underline-italics
    .replace(/__(.*?)__/g, '\u001F$1\u000F')                         // Apply underline
    .replace(/\*\*\*(.*?)\*\*\*/g, '\u0002\u001D$1\u000F')          // Apply bold-italics
    .replace(/\*\*(.*?)\*\*/g, '\u0002$1\u000F')                     // Apply bold
    .replace(/\*(.*?)\*/g, '\u001D$1\u000F');                        // Apply italics
}

export function formatFromIRCToDiscord(text) {
  // Regex doesn't work here, because formatting can be applied arbitrarily in IRC.
  // Iterate over the string, and keep track of which formatting is active,
  // and close all formatting in order if a reset symbol is encountered.

  const FORMATTERS = {
    BOLD: 1,
    ITALICS: 2,
    UNDERLINE: 3,
    discordSymbols: {
      1: '**',
      2: '*',
      3: '__'
    }
  };

  let activeFormatters = [];
  let resultString = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '\u001D') { // italics
      activeFormatters.push(FORMATTERS.ITALICS);
      resultString = resultString.concat('*');
    } else if (char === '\u0002') { // bold
      activeFormatters.push(FORMATTERS.BOLD);
      resultString = resultString.concat('**');
    } else if (char === '\u001F') { // underline
      activeFormatters.push(FORMATTERS.UNDERLINE);
      resultString = resultString.concat('__');
    } else if (char === '\u000F') { // reset
      // Reset all active formattings
      for (let j = (activeFormatters.length - 1); j >= 0; j--) {
        resultString = resultString.concat(FORMATTERS.discordSymbols[activeFormatters[j]]);
      }
      activeFormatters = [];
    } else {
      // Add character
      resultString = resultString.concat(char);
    }
  }

  // Remove all color markers from the message, as discord does not support colored text
  resultString = resultString.replace(/\u0003(\d\d?(,\d\d?)?)?/g, '');

  return resultString;
}
