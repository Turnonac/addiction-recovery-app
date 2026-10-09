import { habitColors } from '@/theme';
import type { HabitKind, IconName } from '@/types';

export interface HabitPreset {
  kind: HabitKind;
  name: string;
  icon: IconName;
  color: string;
  /** Typical daily spend in USD, used as a starting value in the form. */
  defaultDailyCost: number;
  /** Typical daily minutes spent, used as a starting value in the form. */
  defaultDailyMinutes: number;
  /** One-line hint shown in the picker. */
  tagline: string;
  /** Hint for the cost field, e.g. "A pack a day ≈ $10". */
  costHint: string;
}

export const HABIT_PRESETS: HabitPreset[] = [
  {
    kind: 'smoking',
    name: 'Smoking',
    icon: 'smoking',
    color: habitColors.red,
    defaultDailyCost: 10,
    defaultDailyMinutes: 60,
    tagline: 'Cigarettes, cigars, rolling tobacco',
    costHint: 'A pack a day is roughly $8–12',
  },
  {
    kind: 'vaping',
    name: 'Vaping',
    icon: 'smoke',
    color: habitColors.cyan,
    defaultDailyCost: 5,
    defaultDailyMinutes: 45,
    tagline: 'E-cigarettes, pods, disposables',
    costHint: 'Pods or disposables per day',
  },
  {
    kind: 'alcohol',
    name: 'Alcohol',
    icon: 'glass-wine',
    color: habitColors.amber,
    defaultDailyCost: 12,
    defaultDailyMinutes: 120,
    tagline: 'Beer, wine, spirits',
    costHint: 'Average spent on drinks per day',
  },
  {
    kind: 'pornography',
    name: 'Pornography',
    icon: 'eye-off-outline',
    color: habitColors.violet,
    defaultDailyCost: 0,
    defaultDailyMinutes: 45,
    tagline: 'Adult content',
    costHint: 'Subscriptions or purchases, if any',
  },
  {
    kind: 'sugar',
    name: 'Sugar',
    icon: 'candy-outline',
    color: habitColors.pink,
    defaultDailyCost: 3,
    defaultDailyMinutes: 10,
    tagline: 'Sweets, soda, desserts',
    costHint: 'Snacks and sugary drinks per day',
  },
  {
    kind: 'junk_food',
    name: 'Junk food',
    icon: 'hamburger',
    color: habitColors.orange,
    defaultDailyCost: 8,
    defaultDailyMinutes: 20,
    tagline: 'Fast food, chips, takeaways',
    costHint: 'Fast food and snacks per day',
  },
  {
    kind: 'caffeine',
    name: 'Coffee',
    icon: 'coffee',
    color: habitColors.brown,
    defaultDailyCost: 4,
    defaultDailyMinutes: 15,
    tagline: 'Coffee, energy drinks, caffeine pills',
    costHint: 'Coffees or energy drinks per day',
  },
  {
    kind: 'gambling',
    name: 'Gambling',
    icon: 'cards-playing-outline',
    color: habitColors.green,
    defaultDailyCost: 20,
    defaultDailyMinutes: 60,
    tagline: 'Betting, casino, lottery',
    costHint: 'Average amount bet per day',
  },
  {
    kind: 'gaming',
    name: 'Gaming',
    icon: 'controller-classic-outline',
    color: habitColors.blue,
    defaultDailyCost: 1,
    defaultDailyMinutes: 180,
    tagline: 'Video games, in-game purchases',
    costHint: 'In-game purchases per day',
  },
  {
    kind: 'social_media',
    name: 'Social media',
    icon: 'cellphone',
    color: habitColors.indigo,
    defaultDailyCost: 0,
    defaultDailyMinutes: 150,
    tagline: 'Doomscrolling, feeds, short videos',
    costHint: 'Usually free — time is the real cost',
  },
  {
    kind: 'procrastination',
    name: 'Procrastination',
    icon: 'timer-sand',
    color: habitColors.teal,
    defaultDailyCost: 0,
    defaultDailyMinutes: 120,
    tagline: 'Putting things off',
    costHint: 'Usually free — time is the real cost',
  },
  {
    kind: 'overeating',
    name: 'Overeating',
    icon: 'food-drumstick-outline',
    color: habitColors.lime,
    defaultDailyCost: 6,
    defaultDailyMinutes: 30,
    tagline: 'Binge eating, late-night snacking',
    costHint: 'Extra food beyond your needs per day',
  },
  {
    kind: 'custom',
    name: 'Custom',
    icon: 'star-four-points-outline',
    color: habitColors.slate,
    defaultDailyCost: 0,
    defaultDailyMinutes: 0,
    tagline: 'Anything else you want to quit',
    costHint: 'What it costs you per day, if anything',
  },
];

export function presetFor(kind: HabitKind): HabitPreset {
  return HABIT_PRESETS.find((p) => p.kind === kind) ?? HABIT_PRESETS[HABIT_PRESETS.length - 1];
}

/** Icons offered in the custom-habit icon picker. */
export const HABIT_ICON_CHOICES: IconName[] = [
  'smoking',
  'smoke',
  'glass-wine',
  'beer-outline',
  'glass-cocktail',
  'coffee',
  'cup-outline',
  'candy-outline',
  'cupcake',
  'hamburger',
  'pizza',
  'food-drumstick-outline',
  'cards-playing-outline',
  'dice-multiple-outline',
  'controller-classic-outline',
  'cellphone',
  'television-classic',
  'youtube',
  'cart-outline',
  'shopping-outline',
  'pill',
  'cannabis',
  'eye-off-outline',
  'timer-sand',
  'bed-outline',
  'hand-back-left-outline',
  'emoticon-angry-outline',
  'lightning-bolt-outline',
  'heart-broken-outline',
  'star-four-points-outline',
];
