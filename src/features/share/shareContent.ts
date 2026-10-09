import type { HabitSnapshot } from '@/domain/habitStats';
import { shortMoney, streakPhrase } from '@/features/home/homeLogic';
import { currencySymbol, formatInt, formatMoney } from '@/utils/format';

/** The subset of a HabitSnapshot needed to describe progress in text. */
export type ShareSource = Pick<HabitSnapshot, 'streakMs' | 'moneySaved'> & {
  habit: Pick<HabitSnapshot['habit'], 'name' | 'dailyCost' | 'currency'>;
};

/**
 * Text used when sharing progress without an image (web, or as a fallback):
 * "I've been free from Smoking for 29 days and saved ₴4.8K with Quit 💪".
 */
export function shareMessage(s: ShareSource): string {
  const saved = s.habit.dailyCost > 0 && s.moneySaved >= 1 ? ` and saved ${shortMoney(s.moneySaved, s.habit.currency)}` : '';
  return `I've been free from ${s.habit.name} for ${streakPhrase(s.streakMs)}${saved} with Quit 💪`;
}

/** Title for share sheets / dialogs. */
export function shareTitle(s: Pick<ShareSource, 'habit'>): string {
  return `My ${s.habit.name} progress`;
}

/** Money on the share card: whole units with separators from 100 up ("₴9,000"), cents below ("$12.40"). */
export function shareCardMoney(amount: number, currency: string): string {
  const v = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  if (v >= 100) return `${currencySymbol(currency)}${formatInt(Math.round(v))}`;
  return formatMoney(v, currency);
}
