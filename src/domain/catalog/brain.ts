import type { HabitKind } from '@/types';

/**
 * Brain recovery profiles for the /habit/[id]/brain screen. Each habit kind lists
 * the brain systems it affects most, with an approximate number of clean days
 * after which research suggests that system is largely back to baseline.
 * Positions (x, y in 0..1) are on the side-view brain illustration, front facing
 * left. This is a simplified, motivational model — not medical advice.
 */
export interface BrainRegion {
  id: string;
  name: string;
  description: string;
  /** Clean days after which the region counts as fully recovered. */
  fullRecoveryDays: number;
  /** 0..1 horizontal position on the illustration (0 = front of the brain). */
  x: number;
  /** 0..1 vertical position on the illustration (0 = top). */
  y: number;
  color: string;
}

export interface BrainProfile {
  summary: string;
  regions: BrainRegion[];
}

interface Anchor {
  name: string;
  x: number;
  y: number;
  color: string;
}

/** Where each system sits on the illustration and the color used for it. */
const ANCHORS = {
  nach: { name: 'nACh receptors', x: 0.6, y: 0.4, color: '#FF5A36' },
  dopamine: { name: 'Dopamine reward pathway', x: 0.47, y: 0.55, color: '#A78BFA' },
  prefrontal: { name: 'Prefrontal cortex', x: 0.17, y: 0.4, color: '#38BDF8' },
  bloodFlow: { name: 'Cerebral blood flow', x: 0.74, y: 0.27, color: '#34D399' },
  sleep: { name: 'Sleep regulation', x: 0.6, y: 0.79, color: '#818CF8' },
  gaba: { name: 'GABA system', x: 0.56, y: 0.17, color: '#FBBF24' },
  hippocampus: { name: 'Hippocampus', x: 0.62, y: 0.63, color: '#2DD4BF' },
  cerebellum: { name: 'Cerebellum', x: 0.8, y: 0.76, color: '#F472B6' },
  amygdala: { name: 'Amygdala stress response', x: 0.36, y: 0.66, color: '#FB7185' },
  adenosine: { name: 'Adenosine receptors', x: 0.4, y: 0.27, color: '#F59E0B' },
  appetite: { name: 'Appetite regulation', x: 0.5, y: 0.7, color: '#A3E635' },
  // Under the lateral (Sylvian) fissure, hidden by the opercula: drawn on the fissure line.
  insula: { name: 'Insula', x: 0.46, y: 0.555, color: '#F97316' },
  attention: { name: 'Attention network', x: 0.76, y: 0.33, color: '#22D3EE' },
  habitCircuits: { name: 'Habit circuits', x: 0.47, y: 0.38, color: '#E879F9' },
} satisfies Record<string, Anchor>;

type AnchorId = keyof typeof ANCHORS;

function region(id: AnchorId, fullRecoveryDays: number, description: string, at?: { x: number; y: number }): BrainRegion {
  return { id, ...ANCHORS[id], ...at, fullRecoveryDays, description };
}

/** The reward pathway marker sits higher in profiles that also show the insula, so the two don't overlap. */
const DOPAMINE_ABOVE_INSULA = { x: 0.55, y: 0.42 };

const PROFILES: Record<HabitKind, BrainProfile> = {
  smoking: {
    summary:
      'Nicotine dramatically increases nicotinic receptor density and disrupts the dopamine reward system. Within 6–12 weeks of abstinence, receptors return toward non-smoker levels, and prefrontal control over cravings strengthens substantially.',
    regions: [
      region('nach', 84, 'Nicotine makes the brain grow extra nicotinic acetylcholine receptors, which drive cravings. Imaging studies show their density returns to non-smoker levels after roughly 6–12 weeks without nicotine.'),
      region('dopamine', 120, 'Nicotine triggers dopamine release in the reward circuit. As it rebalances, everyday pleasures like food, music and time with people start to feel rewarding again.'),
      region('prefrontal', 270, 'The brain’s control center for planning and impulse control. Every craving you ride out strengthens its top-down control over automatic habits.'),
      region('bloodFlow', 7, 'Carbon monoxide from smoke reduces how much oxygen your blood can carry. Within days of quitting, oxygen delivery to the brain is back to normal.'),
      region('sleep', 28, 'Nicotine is a stimulant that fragments sleep. Once the first weeks of withdrawal pass, sleep becomes deeper and more regular.'),
    ],
  },
  vaping: {
    summary:
      'Vaping delivers nicotine quickly and often, which increases nicotinic receptor density and conditions the reward system to expect frequent hits. After quitting, receptors normalize over 6–12 weeks and craving cues gradually lose their pull.',
    regions: [
      region('nach', 84, 'Frequent nicotine hits make the brain grow extra nicotinic receptors. Without nicotine, their density returns toward normal over roughly 6–12 weeks.'),
      region('dopamine', 120, 'Each puff gives a small dopamine reward that the brain learns to expect. Over time, the reward system recalibrates to everyday pleasures.'),
      region('prefrontal', 240, 'Self-control and planning. Ignoring cues like a coffee break or a stressful moment trains the prefrontal cortex to override automatic urges.'),
      region('sleep', 28, 'Nicotine disrupts deep sleep. After the first weeks without it, sleep quality usually improves.'),
    ],
  },
  alcohol: {
    summary:
      'Alcohol boosts the calming GABA system and dampens glutamate, so the brain adapts by shifting that balance — which is why early sobriety can feel anxious and restless. With abstinence the balance restores within weeks, sleep normalizes, and research shows brain volume and memory networks recover over months.',
    regions: [
      region('gaba', 60, 'Alcohol amplifies GABA, the brain’s main calming signal, and the brain compensates by turning it down. Over the first weeks of sobriety this balance resets, easing anxiety and restlessness.'),
      region('dopamine', 90, 'Drinking releases dopamine and teaches the brain to expect it. As the reward system rebalances, motivation and pleasure from everyday life return.'),
      region('sleep', 45, 'Alcohol suppresses REM sleep. Sleep can be restless at first, then becomes deeper and more restorative over the following weeks.'),
      region('hippocampus', 180, 'The hippocampus supports memory and learning. Studies show its volume and function can improve with sustained abstinence.'),
      region('prefrontal', 365, 'Decision-making and impulse control. Research shows frontal brain regions keep recovering over the first year of sobriety.'),
      region('cerebellum', 365, 'The cerebellum coordinates balance and movement and is sensitive to heavy drinking. Coordination improves gradually with abstinence.'),
    ],
  },
  pornography: {
    summary:
      'Frequent, high-novelty stimulation can blunt the reward system’s response to everyday pleasures and strengthen cue-driven habits. With time away, many people notice reward sensitivity returning, and prefrontal self-control strengthens as new habits take root.',
    regions: [
      region('dopamine', 90, 'Constant novelty trains the reward system to expect intense stimulation. With time away, research suggests it becomes more responsive to ordinary rewards.'),
      region('prefrontal', 180, 'Self-control and long-term thinking. Each urge you ride out strengthens the circuits that help you choose what you actually want.'),
      region('amygdala', 60, 'Urges often show up as a way to escape stress or low mood. As you build other ways to cope, the stress response calms and becomes less tied to the habit.'),
      region('sleep', 21, 'Late-night sessions push bedtime back. Within a few weeks, more consistent sleep improves energy and mood.'),
    ],
  },
  sugar: {
    summary:
      'Sugar activates the same reward circuitry as other pleasures, and frequent spikes can fuel cravings and energy crashes. Within a few weeks, taste perception and reward responses recalibrate, and the brain areas that regulate appetite respond more steadily.',
    regions: [
      region('dopamine', 60, 'Sweet foods trigger a quick dopamine reward. Cutting back lets the reward system recalibrate so cravings lose intensity.', DOPAMINE_ABOVE_INSULA),
      region('appetite', 45, 'The hypothalamus balances hunger and fullness. Without sugar spikes and crashes, appetite signals become steadier and easier to read.'),
      region('insula', 21, 'The insula processes taste. As it recalibrates, fruit and naturally sweet foods start to taste sweeter.'),
      region('prefrontal', 120, 'Planning and self-control. Each craving you skip makes the next choice easier and more automatic.'),
    ],
  },
  junk_food: {
    summary:
      'Highly processed food combines sugar, fat and salt in ways that strongly activate reward circuits and can override fullness signals. As you eat more whole foods, appetite regulation steadies and cravings for hyper-palatable food fade over the weeks.',
    regions: [
      region('dopamine', 60, 'Hyper-palatable food delivers a big reward hit. As you eat more whole foods, the reward system recalibrates and cravings ease.', DOPAMINE_ABOVE_INSULA),
      region('appetite', 45, 'The hypothalamus balances hunger and fullness. With regular, balanced meals, these signals become more reliable.'),
      region('insula', 70, 'The insula processes taste. Your preference for very salty and rich food adapts over about 8–12 weeks.'),
      region('prefrontal', 120, 'Planning and self-control. Preparing meals and resisting quick fixes strengthens long-term decision-making.'),
    ],
  },
  caffeine: {
    summary:
      'Caffeine blocks adenosine, the brain’s sleep-pressure signal, so the brain builds extra adenosine receptors to compensate. Within 1–2 weeks those receptors return to baseline, withdrawal ends, and your natural sleep and alertness rhythms take over.',
    regions: [
      region('adenosine', 12, 'Regular caffeine makes the brain add adenosine receptors, which causes withdrawal headaches and tiredness. They return to baseline within about 7–12 days.'),
      region('sleep', 28, 'Without caffeine masking sleep pressure, you fall asleep more easily and get more deep sleep.'),
      region('amygdala', 21, 'Caffeine raises adrenaline and can amplify anxiety. Without it, many people feel calmer and less jittery.'),
      region('dopamine', 30, 'The daily coffee ritual becomes a small reward the brain anticipates. That pull fades within a few weeks.'),
      region('prefrontal', 60, 'Focus may dip during withdrawal, then returns to a steady baseline that no longer depends on a morning dose.'),
    ],
  },
  gambling: {
    summary:
      'Gambling’s unpredictable wins strongly activate the dopamine system, and near-misses keep urges alive. With abstinence, research suggests reward sensitivity rebalances, the stress response calms, and prefrontal control over impulsive decisions improves.',
    regions: [
      region('dopamine', 120, 'Unpredictable wins create some of the strongest dopamine responses. Over months away, the reward system becomes more responsive to everyday rewards.', DOPAMINE_ABOVE_INSULA),
      region('prefrontal', 180, 'Risk assessment and impulse control. Avoiding bets strengthens the brain’s ability to weigh long-term consequences.'),
      region('amygdala', 60, 'Chasing losses and money worries keep the stress response on high alert. It settles as finances and routines stabilize.'),
      region('insula', 90, 'The insula is linked to urges and the “almost won” feeling of near-misses. Its pull weakens the longer you stay away.'),
    ],
  },
  gaming: {
    summary:
      'Fast-paced games deliver rapid rewards that can make slower activities feel dull and pull attention back to the screen. Time away lets reward sensitivity and attention rebalance, and sleep improves without late-night play.',
    regions: [
      region('dopamine', 90, 'Loot, levels and wins deliver frequent rewards. With a break, slower real-world rewards start to feel satisfying again.'),
      region('prefrontal', 120, 'Planning and self-control. Choosing offline activities strengthens your ability to stick with long-term goals.'),
      region('attention', 60, 'Fast-paced games train rapid attention switching. Over weeks, sustained focus on reading and work becomes easier.'),
      region('sleep', 21, 'Late sessions and screen light delay sleep. Within a few weeks, sleep timing and quality usually improve.'),
    ],
  },
  social_media: {
    summary:
      'Endless feeds and notifications train the brain to expect constant novelty and quick social rewards. Stepping back helps attention networks recover, eases comparison-driven stress, and lets the reward system respond to slower, real-world pleasures.',
    regions: [
      region('dopamine', 60, 'Likes, notifications and endless feeds deliver unpredictable rewards. Without them, everyday activities regain their appeal.'),
      region('attention', 45, 'Constant switching between posts fragments attention. With time away, sustained focus and deep reading come back.'),
      region('amygdala', 30, 'Comparison and fear of missing out keep the stress response active. Many people feel calmer within a few weeks.'),
      region('sleep', 14, 'Scrolling in bed delays sleep. Within two weeks, many people fall asleep faster and wake more rested.'),
    ],
  },
  procrastination: {
    summary:
      'Procrastination is largely an emotion-regulation habit: the brain’s threat system flags a task as unpleasant, and the reward system favors short-term relief. Practicing follow-through strengthens prefrontal planning and makes starting tasks feel less aversive.',
    regions: [
      region('amygdala', 45, 'The amygdala flags hard or uncertain tasks as threats, which makes avoidance tempting. Starting small calms this response over time.'),
      region('prefrontal', 90, 'Planning and follow-through. Each task you start on time strengthens the circuits for goal-directed action.'),
      region('dopamine', 60, 'Quick distractions offer instant relief. As finishing tasks becomes rewarding, the pull of distraction weakens.'),
      region('habitCircuits', 66, 'Repeated routines move into the basal ganglia, where they run on autopilot — about 66 days on average for a new habit.'),
    ],
  },
  overeating: {
    summary:
      'Overeating is shaped by reward signals, stress and missed fullness cues. As eating becomes regular and mindful, the hypothalamus regulates hunger more reliably, and food cues lose some of their pull.',
    regions: [
      region('appetite', 45, 'The hypothalamus balances hunger and fullness. Regular, moderate meals help these signals become reliable again.'),
      region('dopamine', 60, 'Large, rich meals deliver a strong reward. As portions normalize, the reward system recalibrates.'),
      region('amygdala', 45, 'Stress and emotions often trigger eating. Building other coping tools calms this link over time.'),
      region('prefrontal', 120, 'Mindful choices strengthen self-control, making it easier to stop when you are comfortably full.'),
    ],
  },
  custom: {
    summary:
      'Every habit lives in the brain as a loop of cue, routine and reward. Each time you break the loop, the old pathway weakens, and the prefrontal cortex gets better at choosing what you actually want.',
    regions: [
      region('habitCircuits', 66, 'Habits run on autopilot in the basal ganglia. Research suggests a new routine takes about 66 days on average to become automatic.'),
      region('dopamine', 90, 'The reward system learns to expect the habit’s payoff. Over time, new routines become rewarding instead.'),
      region('prefrontal', 120, 'Self-control and planning. Every urge you resist strengthens your ability to act on long-term goals.'),
      region('amygdala', 45, 'Stress is a common trigger. As you find other ways to cope, the stress response becomes less tied to the habit.'),
    ],
  },
};

/** Brain recovery profile for a habit kind (unknown kinds use the generic profile). */
export function getBrainProfile(kind: HabitKind): BrainProfile {
  return PROFILES[kind] ?? PROFILES.custom;
}

/** Exponent of the ease-out recovery curve: fast early gains that taper off. */
export const RECOVERY_CURVE_EXPONENT = 2.5;

/** 0..1 recovery of a region after `cleanDays` (fractional) — a smooth ease-out capped at 100%. */
export function regionRecovery(cleanDays: number, fullRecoveryDays: number): number {
  if (fullRecoveryDays <= 0) return 1;
  const t = Math.max(0, Math.min(1, cleanDays / fullRecoveryDays));
  return 1 - Math.pow(1 - t, RECOVERY_CURVE_EXPONENT);
}

/** Whole days left until a region counts as fully recovered (0 once recovered). */
export function daysUntilRecovered(region: Pick<BrainRegion, 'fullRecoveryDays'>, cleanDays: number): number {
  return Math.max(0, Math.ceil(region.fullRecoveryDays - Math.max(0, cleanDays)));
}

/** Average recovery across regions (0..1). */
export function overallRecovery(regions: Pick<BrainRegion, 'fullRecoveryDays'>[], cleanDays: number): number {
  if (regions.length === 0) return 0;
  const sum = regions.reduce((acc, r) => acc + regionRecovery(cleanDays, r.fullRecoveryDays), 0);
  return sum / regions.length;
}

export interface BrainRecoveryStats {
  /** 0..1 average recovery. */
  overall: number;
  /** Regions at 100%. */
  recovered: number;
  /** Regions still below 100%. */
  recovering: number;
  total: number;
}

export function brainRecoveryStats(profile: BrainProfile, cleanDays: number): BrainRecoveryStats {
  const recovered = profile.regions.filter((r) => regionRecovery(cleanDays, r.fullRecoveryDays) >= 1).length;
  return {
    overall: overallRecovery(profile.regions, cleanDays),
    recovered,
    recovering: profile.regions.length - recovered,
    total: profile.regions.length,
  };
}
