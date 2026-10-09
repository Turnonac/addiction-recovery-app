import { DAY, HOUR } from '@/domain/time';
import { shareCardMoney, shareMessage, shareTitle, type ShareSource } from '../shareContent';

const source = (over: Partial<ShareSource> = {}, habit: Partial<ShareSource['habit']> = {}): ShareSource => ({
  streakMs: 29 * DAY + 2 * HOUR,
  moneySaved: 0,
  ...over,
  habit: { name: 'Smoking', dailyCost: 0, currency: 'USD', ...habit },
});

describe('shareMessage', () => {
  it('describes the streak', () => {
    expect(shareMessage(source())).toBe("I've been free from Smoking for 29 days with Quit 💪");
  });

  it('mentions money saved when tracked', () => {
    expect(shareMessage(source({ moneySaved: 4823 }, { dailyCost: 120, currency: 'UAH' }))).toBe(
      "I've been free from Smoking for 29 days and saved ₴4.8K with Quit 💪",
    );
  });

  it('skips money below one unit and uses hours on day one', () => {
    expect(shareMessage(source({ streakMs: 5 * HOUR, moneySaved: 0.4 }, { name: 'Coffee', dailyCost: 4 }))).toBe(
      "I've been free from Coffee for 5 hours with Quit 💪",
    );
  });

  it('says "less than a minute" for a brand-new habit', () => {
    expect(shareMessage(source({ streakMs: 20 * 1000 }))).toBe("I've been free from Smoking for less than a minute with Quit 💪");
  });

  it('builds a title', () => {
    expect(shareTitle(source())).toBe('My Smoking progress');
  });
});

describe('shareCardMoney', () => {
  it('rounds larger amounts and keeps cents on small ones', () => {
    expect(shareCardMoney(8999.6, 'UAH')).toBe('₴9,000');
    expect(shareCardMoney(124.05, 'USD')).toBe('$124');
    expect(shareCardMoney(12.4, 'EUR')).toBe('€12.40');
    expect(shareCardMoney(-1, 'USD')).toBe('$0.00');
  });
});
