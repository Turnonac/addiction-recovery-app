import { CERTIFICATE_DAYS, milestoneLabel } from '@/domain/milestones';

const LINES: Record<number, string> = {
  1: 'The first day is the hardest — and you just did it.',
  3: 'Three days in. Cravings peak around now, and you are riding them out.',
  7: 'One full week. You have proven to yourself that you can do this.',
  14: 'Two weeks strong. New routines are quietly taking root.',
  30: 'A whole month. Your brain is rewiring itself, one clean day at a time.',
  60: 'Two months. What once felt impossible is becoming your normal.',
  90: 'Three months — a true turning point. This is who you are now.',
  180: 'Half a year of choosing yourself, every single day.',
  365: 'One full year. An entire trip around the sun, free.',
};

/** Short motivational line shown on the celebration card. */
export function milestoneMessage(days: number): string {
  if (LINES[days]) return LINES[days];
  if (days > 365 && days % 365 === 0) return `${days / 365} years free. You are living proof that change lasts.`;
  return 'Another milestone behind you. Keep going — it only gets better.';
}

/** "1 month free from Alcohol!" */
export function milestoneTitle(days: number, habitName: string): string {
  return `${milestoneLabel(days)} free from ${habitName}!`;
}

/** Text used when sharing a milestone. */
export function milestoneShareText(days: number, habitName: string): string {
  return `I'm ${milestoneLabel(days)} free from ${habitName}! 🎉 Tracking every clean day with Quit.`;
}

export function hasCertificate(days: number): boolean {
  return (CERTIFICATE_DAYS as readonly number[]).includes(days);
}
