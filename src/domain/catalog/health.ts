import { DAY, HOUR, MINUTE, MONTH, WEEK, YEAR } from '@/domain/time';
import type { HabitKind, IconName } from '@/types';

/**
 * Health recovery timelines shown on the habit detail screen and the
 * /habit/[id]/health screen. Content is general, evidence-informed information
 * (WHO, CDC, NHS and peer-reviewed research) phrased without alarmism. It is not
 * medical advice; the UI shows a disclaimer.
 */
export interface HealthMilestone {
  id: string;
  /** Clean time (ms since the current streak started) after which it is reached. */
  afterMs: number;
  title: string;
  description: string;
  icon: IconName;
}

type Entry = [afterMs: number, icon: IconName, title: string, description: string];

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function build(kind: HabitKind, entries: Entry[]): HealthMilestone[] {
  return entries
    .map(([afterMs, icon, title, description]) => ({ id: `${kind}_${slug(title)}`, afterMs, title, description, icon }))
    .sort((a, b) => a.afterMs - b.afterMs);
}

const TIMELINES: Record<HabitKind, HealthMilestone[]> = {
  smoking: build('smoking', [
    [20 * MINUTE, 'heart-pulse', 'Heart rate drops', 'Your heart rate and blood pressure begin to fall back toward normal levels.'],
    [8 * HOUR, 'molecule-co', 'Oxygen levels rise', 'Carbon monoxide in your blood falls toward normal, so more oxygen reaches your organs and muscles.'],
    [DAY, 'heart-outline', 'Heart attack risk starts to fall', 'With less carbon monoxide and nicotine strain on your heart, your risk of a heart attack is already beginning to decrease.'],
    [2 * DAY, 'scent', 'Taste and smell return', 'Damaged nerve endings start to regrow, and many people notice food tastes and smells better.'],
    [3 * DAY, 'lungs', 'Breathing gets easier', 'Bronchial tubes begin to relax and energy rises. Nicotine has left your body, so cravings often peak around now, then ease.'],
    [2 * WEEK, 'run', 'Circulation improves', 'Blood flow to your hands, feet and muscles improves, making walking and exercise feel easier.'],
    [12 * WEEK, 'run-fast', 'Lung function improves', 'Over the first 2–12 weeks, circulation and lung function improve noticeably. Many people find exercise much easier.'],
    [9 * MONTH, 'weather-windy', 'Less coughing', 'Coughing and shortness of breath decrease as the tiny hair-like cilia in your lungs regrow and clear mucus again.'],
    [YEAR, 'heart-plus-outline', 'Heart disease risk halved', 'Your excess risk of coronary heart disease is now about half that of someone who still smokes.'],
    [5 * YEAR, 'brain', 'Stroke risk falls', 'Your risk of stroke can fall to that of a non-smoker, and the risk of mouth, throat and bladder cancers is roughly halved.'],
    [10 * YEAR, 'shield-check-outline', 'Lung cancer risk halved', 'Your risk of dying from lung cancer is about half that of a person who still smokes, and other cancer risks keep falling.'],
    [15 * YEAR, 'trophy-outline', 'Heart like a non-smoker', 'Your risk of coronary heart disease is close to that of someone who has never smoked.'],
  ]),

  vaping: build('vaping', [
    [20 * MINUTE, 'heart-pulse', 'Heart rate settles', 'Without a fresh dose of nicotine, your heart rate and blood pressure start to come down.'],
    [DAY, 'water-outline', 'Nicotine leaves your blood', 'Nicotine has a short half-life, so within a day most of it has cleared from your bloodstream.'],
    [3 * DAY, 'lightning-bolt', 'Cravings peak, then ease', 'Nicotine byproducts are largely gone. Cravings and irritability often peak around day three — each one passes within minutes.'],
    [WEEK, 'scent', 'Taste and smell sharpen', 'Your mouth and throat are less irritated, and many people notice food tastes and smells better.'],
    [2 * WEEK, 'run', 'Circulation improves', 'Blood vessels relax and circulation improves, so physical activity starts to feel easier.'],
    [MONTH, 'lungs', 'Airways calm down', 'Airway irritation settles. Coughing, wheezing and throat clearing tend to decrease.'],
    [3 * MONTH, 'brain', 'Nicotine receptors normalize', 'Brain imaging studies show nicotine receptors return toward non-smoker levels within about 6–12 weeks, so cravings become much rarer.'],
    [6 * MONTH, 'tooth-outline', 'Healthier gums', 'Nicotine narrows blood vessels in the gums. Without it, gum blood flow and oral health keep improving.'],
    [YEAR, 'heart-plus-outline', 'Lower heart strain', 'A year without nicotine means less strain on your heart and blood vessels, and a lower resting blood pressure for many people.'],
  ]),

  alcohol: build('alcohol', [
    [DAY, 'water-outline', 'Body rebalances', 'Your liver has cleared the alcohol, blood sugar starts to steady and hydration improves. If you drank heavily every day, check in with a doctor about withdrawal.'],
    [3 * DAY, 'lightning-bolt', 'Withdrawal eases', 'For most people, physical withdrawal symptoms like shakiness, sweating and anxiety peak within the first 1–3 days and then fade.'],
    [WEEK, 'sleep', 'Deeper sleep', 'Without alcohol suppressing REM sleep, you wake up more rested. Dreams may feel vivid at first as REM sleep rebounds.'],
    [2 * WEEK, 'stomach', 'Calmer stomach', 'The stomach lining starts to recover, with less acid reflux and better digestion — and far fewer empty calories.'],
    [MONTH, 'heart-pulse', 'Liver and heart benefits', 'Research on a month off alcohol found lower liver fat, blood pressure and insulin resistance in regular drinkers.'],
    [2 * MONTH, 'water-percent', 'Clearer skin', 'Better hydration and less inflammation often show up as clearer, less puffy skin.'],
    [3 * MONTH, 'emoticon-happy-outline', 'Mood steadies', 'As the brain’s GABA and glutamate systems rebalance, many people notice less anxiety and a more stable mood.'],
    [6 * MONTH, 'shield-check-outline', 'Stronger immunity', 'Alcohol suppresses the immune system. After months without it, your body is better at fighting off infections.'],
    [YEAR, 'trophy-outline', 'Lower long-term risks', 'Risks of liver disease, high blood pressure and several cancers keep falling the longer you stay alcohol-free.'],
  ]),

  pornography: build('pornography', [
    [DAY, 'flag-checkered', 'First day done', 'You broke the automatic loop for a full day. Every urge you ride out weakens the habit.'],
    [3 * DAY, 'lightning-bolt', 'Urges peak', 'Many people notice urges are strongest in the first days. They come in waves and usually pass within 15–20 minutes.'],
    [WEEK, 'sleep', 'Better sleep', 'Fewer late-night sessions mean more consistent sleep and more energy in the morning.'],
    [2 * WEEK, 'target', 'Sharper focus', 'Without a constant stream of novelty, many people find it easier to concentrate and stay on task.'],
    [MONTH, 'battery-charging-high', 'More motivation', 'Many people report more drive for work, exercise and hobbies as everyday activities feel rewarding again.'],
    [2 * MONTH, 'brain', 'Reward system rebalances', 'Research suggests the brain’s reward circuits become more responsive to ordinary pleasures once constant high stimulation is removed.'],
    [3 * MONTH, 'head-cog-outline', 'Habit loop weakens', 'Around 90 days, many people find old cues trigger far fewer urges, and new routines feel automatic.'],
    [6 * MONTH, 'account-heart-outline', 'Deeper connection', 'Many people describe feeling more present and close in relationships, with healthier expectations around intimacy.'],
    [YEAR, 'trophy-outline', 'Lasting freedom', 'A full year of new habits. Urges are rare, and you have built real confidence that you are in control.'],
  ]),

  sugar: build('sugar', [
    [DAY, 'pulse', 'Steadier blood sugar', 'Without sugar spikes and crashes, your blood sugar and energy levels start to even out.'],
    [3 * DAY, 'lightning-bolt', 'Cravings peak', 'Sugar cravings, irritability and low energy often peak in the first 2–5 days. Protein, fiber and water help.'],
    [WEEK, 'battery-high', 'More stable energy', 'Fewer mid-afternoon slumps. Many people notice steadier focus and mood through the day.'],
    [2 * WEEK, 'food-apple-outline', 'Taste buds reset', 'Your taste perception adapts — fruit and naturally sweet foods start to taste sweeter and more satisfying.'],
    [MONTH, 'tooth-outline', 'Healthier teeth and skin', 'Less sugar means less fuel for the bacteria that cause tooth decay, and some people notice clearer skin.'],
    [2 * MONTH, 'heart-pulse', 'Better insulin sensitivity', 'Cutting added sugar can improve insulin sensitivity and lower triglycerides and blood pressure.'],
    [3 * MONTH, 'scale-bathroom', 'Less liver and belly fat', 'Studies show that cutting sugar, especially from sweet drinks, can lower liver fat and waist size within weeks to months.'],
    [YEAR, 'shield-check-outline', 'Lower long-term risk', 'A year of low added sugar lowers your risk of type 2 diabetes, heart disease and fatty liver disease.'],
  ]),

  junk_food: build('junk_food', [
    [DAY, 'water-outline', 'Less bloating', 'Less sodium means less water retention — many people feel lighter and less puffy within a day or two.'],
    [3 * DAY, 'lightning-bolt', 'Cravings peak', 'Cravings for salty, fatty and sweet foods are often strongest in the first few days, then become easier to ignore.'],
    [WEEK, 'stomach', 'Better digestion', 'More whole foods and fiber help digestion. Research shows the gut microbiome starts to shift within days of a diet change.'],
    [2 * WEEK, 'battery-high', 'Steadier energy', 'Balanced meals avoid the heavy, sluggish feeling after greasy food, so your energy stays more even.'],
    [MONTH, 'heart-pulse', 'Lower blood pressure', 'Cutting back on salt-heavy processed food can lower blood pressure within weeks.'],
    [2 * MONTH, 'food-apple-outline', 'Palate adjusts', 'Your taste for salt adapts over about 8–12 weeks, and fast food starts to taste overly salty and rich.'],
    [3 * MONTH, 'heart-plus-outline', 'Better cholesterol', 'Eating less saturated and trans fat can improve LDL cholesterol and triglyceride levels.'],
    [6 * MONTH, 'scale-bathroom', 'Healthier weight', 'Fewer calorie-dense meals make it easier to reach and keep a healthy weight without strict dieting.'],
    [YEAR, 'shield-check-outline', 'Lower heart risk', 'A year of better eating lowers your long-term risk of heart disease, stroke and type 2 diabetes.'],
  ]),

  caffeine: build('caffeine', [
    [DAY, 'clock-check-outline', 'Caffeine cleared', 'Caffeine has a half-life of around five hours, so by now it has largely left your system.'],
    [2 * DAY, 'lightning-bolt', 'Withdrawal peaks', 'Headaches, tiredness and foggy focus usually peak within 1–2 days. Water, rest and daylight help.'],
    [9 * DAY, 'emoticon-happy-outline', 'Withdrawal fades', 'For most people, withdrawal symptoms resolve within 2–9 days, and mood and focus settle.'],
    [12 * DAY, 'brain', 'Adenosine receptors reset', 'Your brain trims the extra adenosine receptors it built to cope with caffeine, usually within 7–12 days.'],
    [3 * WEEK, 'sleep', 'Deeper sleep', 'Without caffeine masking sleep pressure, falling asleep is easier and deep sleep improves.'],
    [3 * MONTH, 'battery-charging-high', 'Natural energy', 'Your body’s natural energy systems work without caffeine.'],
    [6 * MONTH, 'meditation', 'Steady balance', 'Energy, mood and sleep feel steady without daily highs and crashes, and many people notice less anxiety.'],
  ]),

  gambling: build('gambling', [
    [DAY, 'piggy-bank-outline', 'Money stays yours', 'Every day without a bet is money that stays in your account instead of with the house.'],
    [3 * DAY, 'lightning-bolt', 'Urges peak', 'Urges and restlessness are often strongest early on. Blocking apps and limiting access to cash make them easier to ride out.'],
    [WEEK, 'meditation', 'Calmer mind', 'Without the cycle of chasing losses, many people feel less anxious and preoccupied.'],
    [2 * WEEK, 'sleep', 'Better sleep', 'Fewer late-night sessions and less money worry help sleep become deeper and more regular.'],
    [MONTH, 'cash-multiple', 'Financial clarity', 'A full month of savings. It becomes easier to see where your money goes and to plan for any debts.'],
    [3 * MONTH, 'brain', 'Reward system recalibrates', 'Research suggests the brain’s reward circuits become more responsive to everyday rewards, and urges become less frequent.'],
    [6 * MONTH, 'account-heart-outline', 'Trust rebuilds', 'Months of consistency help repair relationships strained by gambling, and talking about money gets easier.'],
    [YEAR, 'trophy-outline', 'New stability', 'A year of savings and steadier finances. Many people describe a renewed sense of control and self-respect.'],
  ]),

  gaming: build('gaming', [
    [DAY, 'clock-check-outline', 'Time reclaimed', 'Hours that went into gaming are now free for sleep, movement, people and projects.'],
    [3 * DAY, 'lightning-bolt', 'Restlessness peaks', 'Boredom and urges to play are usually strongest in the first days. Plan offline activities for your usual gaming times.'],
    [WEEK, 'sleep', 'Better sleep', 'No late-night sessions or bright screens before bed means falling asleep faster and waking more refreshed.'],
    [2 * WEEK, 'target', 'Sharper focus', 'With fewer high-intensity rewards, many people find studying, reading and work easier to stick with.'],
    [MONTH, 'sprout', 'Real-world rewards', 'Everyday activities start to feel more rewarding as your brain adapts to a calmer level of stimulation.'],
    [2 * MONTH, 'run', 'More active', 'Time once spent sitting often turns into walks, sport or hobbies, boosting both mood and fitness.'],
    [3 * MONTH, 'account-group-outline', 'Stronger connections', 'Many people notice more time and energy for friends, family and face-to-face conversations.'],
    [6 * MONTH, 'trophy-outline', 'New skills', 'Months of reclaimed time add up to hundreds of hours invested in skills, health and goals that matter to you.'],
  ]),

  social_media: build('social_media', [
    [DAY, 'bell-off-outline', 'Quieter mind', 'Fewer notifications and feeds mean fewer interruptions, and your attention starts to settle.'],
    [3 * DAY, 'cellphone-off', 'Phantom urges peak', 'Reaching for your phone on autopilot is most common early on. Noticing the urge is how the habit weakens.'],
    [WEEK, 'emoticon-happy-outline', 'Better well-being', 'A study found that a one-week break from social media improved well-being and reduced anxiety and low mood.'],
    [2 * WEEK, 'sleep', 'Better sleep', 'Less scrolling in bed means less late-night light and stimulation, so sleep comes more easily.'],
    [3 * WEEK, 'account-heart-outline', 'Less comparison', 'Research suggests that limiting social media for three weeks can reduce loneliness and depressive symptoms.'],
    [MONTH, 'target', 'Longer attention span', 'Without constant feed-switching, many people find it easier to read, focus and get into deep work.'],
    [2 * MONTH, 'book-open-page-variant-outline', 'Time for what matters', 'Hours of daily scrolling turn into reading, hobbies, exercise and real conversations.'],
    [3 * MONTH, 'head-heart-outline', 'Intentional habits', 'You choose when and why to go online. Many people feel calmer, more present and more in control of their time.'],
  ]),

  procrastination: build('procrastination', [
    [DAY, 'flag-checkered', 'First win', 'You started instead of postponing. Starting is the hardest part, and momentum makes the next task easier.'],
    [3 * DAY, 'meditation', 'Less dread', 'Facing tasks early lowers the background guilt and anxiety that build up around unfinished work.'],
    [WEEK, 'progress-check', 'Momentum', 'A week of follow-through. Small finished tasks build a sense of progress and confidence.'],
    [2 * WEEK, 'heart-pulse', 'Lower stress', 'Research links chronic procrastination with higher stress and poorer sleep. Acting earlier eases both.'],
    [3 * WEEK, 'calendar-check', 'Routine forming', 'Your plan-and-do routine is taking shape. Consistent cues like a set time and place make starting automatic.'],
    [MONTH, 'shield-check-outline', 'Self-trust', 'Keeping promises to yourself for a month builds trust that you will do what you say.'],
    [66 * DAY, 'head-cog-outline', 'Habit on autopilot', 'A well-known study (Lally et al., 2009) found it takes about 66 days on average for a new behavior to become automatic.'],
    [3 * MONTH, 'trophy-outline', 'Compounding progress', 'Three months of steady action compound into finished projects, better results and more free time.'],
  ]),

  overeating: build('overeating', [
    [DAY, 'stomach', 'Lighter feeling', 'Less discomfort, bloating and heartburn after meals. Eating to comfortable fullness simply feels better.'],
    [3 * DAY, 'food-apple-outline', 'Hunger cues return', 'Eating slowly and regularly helps you notice real hunger and fullness signals again.'],
    [WEEK, 'sleep', 'Better sleep', 'Lighter evening meals mean less reflux and more restful sleep.'],
    [2 * WEEK, 'battery-high', 'Steadier energy', 'Moderate portions avoid the post-meal slump, keeping your energy more even through the day.'],
    [MONTH, 'meditation', 'Fewer urges', 'Many people find the urge to eat for comfort or out of habit becomes weaker and easier to manage.'],
    [3 * MONTH, 'heart-pulse', 'Metabolic boost', 'Even losing around 5% of body weight can improve blood pressure, blood sugar and cholesterol.'],
    [6 * MONTH, 'emoticon-happy-outline', 'Body confidence', 'Many people report a calmer relationship with food and more confidence in their own body.'],
    [YEAR, 'shield-check-outline', 'Long-term health', 'A year of balanced eating lowers long-term risk of type 2 diabetes, heart disease and joint problems.'],
  ]),

  custom: build('custom', [
    [DAY, 'flag-checkered', 'Day one done', 'The first day is often the hardest. You proved you can break the pattern.'],
    [3 * DAY, 'lightning-bolt', 'Cravings peak', 'Urges tend to be strongest around days 3–5. They come in waves and pass — ride them out.'],
    [WEEK, 'calendar-check', 'First week', 'A full week. Your triggers are easier to spot, and you have strategies that work.'],
    [2 * WEEK, 'trending-up', 'Building momentum', 'Urges are usually less frequent and less intense. Each one you resist weakens the habit loop.'],
    [3 * WEEK, 'sync', 'New routine', 'Replacement routines start to feel natural, and the old habit takes up less of your attention.'],
    [MONTH, 'shield-check-outline', 'One month strong', 'A month of change. Many people notice more energy, a better mood and pride in their progress.'],
    [66 * DAY, 'head-cog-outline', 'Automatic habit', 'Research (Lally et al., 2009) found new behaviors take about 66 days on average to become automatic.'],
    [3 * MONTH, 'sprout', 'New normal', 'Three months in, your new way of living feels normal rather than effortful.'],
    [YEAR, 'trophy-outline', 'Lasting change', 'A full year. The old habit has little pull, and you have proven to yourself that change is possible.'],
  ]),
};

/** Health milestones for a habit kind, sorted by `afterMs` (unknown kinds use the generic timeline). */
export function getHealthTimeline(kind: HabitKind): HealthMilestone[] {
  return TIMELINES[kind] ?? TIMELINES.custom;
}

export interface HealthProgressCurrent {
  milestone: HealthMilestone;
  /** Index of the milestone in the timeline. */
  index: number;
  /** 0..1 — clean time relative to the milestone's `afterMs`. */
  fraction: number;
  msRemaining: number;
}

export interface HealthProgress {
  /** Number of milestones reached. */
  achieved: number;
  total: number;
  /** The next milestone to reach, or null once every milestone is achieved. */
  current: HealthProgressCurrent | null;
  /** The most recently reached milestone, or null if none yet. */
  lastAchieved: { milestone: HealthMilestone; index: number } | null;
}

/** Where a clean streak of `cleanMs` stands on a (sorted) health timeline. */
export function healthProgress(timeline: HealthMilestone[], cleanMs: number): HealthProgress {
  const clean = Math.max(0, cleanMs);
  let achieved = 0;
  while (achieved < timeline.length && timeline[achieved].afterMs <= clean) achieved++;
  const next = timeline[achieved];
  const last = achieved > 0 ? timeline[achieved - 1] : undefined;
  return {
    achieved,
    total: timeline.length,
    current: next
      ? {
          milestone: next,
          index: achieved,
          fraction: next.afterMs > 0 ? Math.max(0, Math.min(1, clean / next.afterMs)) : 1,
          msRemaining: Math.max(0, next.afterMs - clean),
        }
      : null,
    lastAchieved: last ? { milestone: last, index: achieved - 1 } : null,
  };
}
