/* eslint-disable prefer-arrow-callback */

import chai from 'chai';
import { formatFromDiscordToIRC, formatFromIRCToDiscord } from '../lib/formatting';

chai.should();

describe('Formatting', () => {
  describe('Discord to IRC', () => {
    it('should convert bold markdown', () => {
      formatFromDiscordToIRC('**text**').should.equal('\x02text\x02');
    });

    it('should convert italic markdown', () => {
      formatFromDiscordToIRC('*text*').should.equal('\x16text\x16');
      formatFromDiscordToIRC('_text_').should.equal('\x16text\x16');
    });

    it('should convert underline markdown', () => {
      formatFromDiscordToIRC('__text__').should.equal('\x1ftext\x1f');
    });

    it('should ignore strikethrough markdown', () => {
      formatFromDiscordToIRC('~~text~~').should.equal('text');
    });

    it('should convert nested markdown', () => {
      formatFromDiscordToIRC('**bold *italics***')
      .should.equal('\x02bold \x16italics\x16\x02');
    });
  });

  describe('IRC to Discord', () => {
    it('should convert bold IRC format', () => {
      formatFromIRCToDiscord('\x02text\x02').should.equal('**text**');
    });

    it('should convert reverse IRC format', () => {
      formatFromIRCToDiscord('\x16text\x16').should.equal('*text*');
    });

    it('should convert italic IRC format', () => {
      formatFromIRCToDiscord('\x1dtext\x1d').should.equal('*text*');
    });

    it('should convert underline IRC format', () => {
      formatFromIRCToDiscord('\x1ftext\x1f').should.equal('__text__');
    });

    it('should ignore color IRC format', () => {
      formatFromIRCToDiscord('\x0306,08text\x03').should.equal('text');
    });

    it('should convert nested IRC format', () => {
      formatFromIRCToDiscord('\x02bold \x16italics\x16\x02')
      .should.equal('**bold *italics***');
    });
  });
});
