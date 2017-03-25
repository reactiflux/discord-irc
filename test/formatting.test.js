/* eslint-disable prefer-arrow-callback */

import chai from 'chai';
import { formatFromDiscordToIRC, formatFromIRCToDiscord } from '../lib/formatting';

const expect = chai.expect;

describe('Formatting', function () {
  it('should parse a discord string into an irc string', function () {
    const result = formatFromDiscordToIRC('**Hello!** *This* ~~is~~ __*a*__ __**discord**__ ' +
      '__string__ __***with***__ *some* ***formatting.***');
    expect(result).to.equal('\u0002Hello!\u0002 \u0016This\u0016 is \u001f\u0016a\u0016\u001f ' +
      '\u001f\u0002discord\u0002\u001f \u001fstring\u001f \u001f\u0016\u0002with\u0002\u0016\u001f ' +
      '\u0016some\u0016 \u0016\u0002formatting.\u0002\u0016');
  });

  it('should parse an irc string into a discord string', function () {
    const result = formatFromIRCToDiscord('\u0002Hello!\u000F \u001DThis\u000F is ' +
      '\u001F\u001Da\u000F \u001F\u0002discord\u000F \u001F\u000306string\u0003\u000F ' +
      '\u001F\u001D\u0002with\u000F \u001D\u000304,01some\u0003\u000F ' +
      '\u0002\u001Dformatting.\u000F');
    expect(result).to.equal('**Hello!** *This* is __*a*__ __**discord**__ __string__ ' +
      '__***with***__ *some* ***formatting.***');
  });
});
