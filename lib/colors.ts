interface Codes {
  [key: string]: string;
}

export const DEFAULT_NICK_COLORS = [
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
];

const codes: Codes = {
  white: '\u000300',
  black: '\u000301',
  dark_blue: '\u000302',
  dark_green: '\u000303',
  light_red: '\u000304',
  dark_red: '\u000305',
  magenta: '\u000306',
  orange: '\u000307',
  yellow: '\u000308',
  light_green: '\u000309',
  cyan: '\u000310',
  light_cyan: '\u000311',
  light_blue: '\u000312',
  light_magenta: '\u000313',
  gray: '\u000314',
  light_gray: '\u000315',

  bold: '\u0002',
  underline: '\u001f',

  reset: '\u000f',
};

export { codes };

function wrap(color: string, text: string, resetColor?: string): string {
  if (codes[color]) {
    text = codes[color] + text;
    text += codes[resetColor ?? ''] ? codes[resetColor ?? ''] : codes.reset;
  }
  return text;
}

export { wrap };
