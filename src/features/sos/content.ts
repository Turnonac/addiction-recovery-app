import type { IconName } from '@/types';

/** Rotating encouragement for "Wait It Out" (one every 30 seconds). */
export const WAIT_MESSAGES: string[] = [
  'Cravings are like waves — they rise, peak and fall.',
  "You don't have to act on a thought.",
  'Notice where you feel it in your body.',
  'This feeling is temporary. It is already changing.',
  "Every minute you wait, the urge loses a little of its grip.",
  'Breathe slowly. Your body knows how to calm down.',
  'You have survived every craving so far. This one too.',
  "Name it: \"I'm having an urge.\" You are not the urge.",
  'Get curious instead of fighting. What does it actually feel like?',
  'Unclench your jaw. Drop your shoulders. Soften your hands.',
  'Think of the person you are becoming. They are proud of this minute.',
  'A craving is a signal of healing, not a command.',
  'Sip some water. Look out of a window. Let time do the work.',
  'You are retraining your brain right now — this is the work.',
  'The peak is behind you more often than you think.',
  'Almost there. Stay with the wave and let it pass.',
];

/** "1-Minute Meditation" prompts, one every 15 seconds. */
export const MEDITATION_PROMPTS: string[] = [
  'Close your eyes, or soften your gaze toward the floor.',
  'Feel the air entering your nose — cool on the way in.',
  'Let each exhale be a little longer than the inhale.',
  'Notice the craving without judging it. Let it be here, and let it go.',
];

export interface GroundingStep {
  count: number;
  sense: string;
  verb: string;
  icon: IconName;
  hint: string;
}

/** 5-4-3-2-1 grounding: one card per sense. */
export const GROUNDING_STEPS: GroundingStep[] = [
  { count: 5, sense: 'see', verb: 'things you can see', icon: 'eye-outline', hint: 'Look around slowly. A lamp, a shadow, the color of a wall — name each one silently.' },
  { count: 4, sense: 'touch', verb: 'things you can touch', icon: 'hand-back-right-outline', hint: 'Your feet on the floor, the fabric of your sleeve, a cool surface under your palm.' },
  { count: 3, sense: 'hear', verb: 'things you can hear', icon: 'ear-hearing', hint: 'Traffic, a fridge humming, your own breath. Listen past the nearest sound.' },
  { count: 2, sense: 'smell', verb: 'things you can smell', icon: 'flower-outline', hint: 'Coffee, soap, fresh air. If nothing comes, recall a smell you love.' },
  { count: 1, sense: 'taste', verb: 'thing you can taste', icon: 'food-apple-outline', hint: 'Toothpaste, water, the last thing you ate. Notice it on your tongue.' },
];

export type BodyRegionId = 'feet' | 'legs' | 'hips' | 'belly' | 'chest' | 'hands' | 'shoulders' | 'jaw' | 'forehead';

export interface BodyRegion {
  id: BodyRegionId;
  name: string;
  instruction: string;
}

/** Body scan, bottom to top, ~20 seconds each. */
export const BODY_REGIONS: BodyRegion[] = [
  { id: 'feet', name: 'Feet', instruction: 'Feel your feet on the ground. Notice warmth, pressure, the floor holding you up.' },
  { id: 'legs', name: 'Legs', instruction: 'Let your calves and thighs grow heavy. Nothing to do, nowhere to go.' },
  { id: 'hips', name: 'Hips', instruction: 'Notice where your body meets the seat. Let the weight sink down.' },
  { id: 'belly', name: 'Belly', instruction: 'Let your belly be soft. Feel it rise as you breathe in and fall as you breathe out.' },
  { id: 'chest', name: 'Chest', instruction: 'Notice your heartbeat and breath. If the craving lives here, just observe it.' },
  { id: 'hands', name: 'Hands', instruction: 'Open your hands. Feel each finger, the air on your palms. Let them rest.' },
  { id: 'shoulders', name: 'Shoulders', instruction: 'Lift your shoulders to your ears… and let them drop. Feel the release.' },
  { id: 'jaw', name: 'Jaw', instruction: 'Unclench your teeth. Let your tongue rest and your jaw hang loose.' },
  { id: 'forehead', name: 'Forehead', instruction: 'Smooth out your brow. Soften the space between your eyes. You are calm.' },
];

export interface ColdStep {
  title: string;
  detail: string;
  icon: IconName;
}

/** Cold water reset steps, 30 seconds each. */
export const COLD_STEPS: ColdStep[] = [
  { title: 'Splash cold water on your face', detail: 'Cover your forehead, eyes and cheeks. Hold your breath for a few seconds as you do it.', icon: 'water' },
  { title: 'Hold something cold', detail: 'Ice cubes, a cold can or a wet towel. Press it to your wrists or the back of your neck.', icon: 'snowflake' },
  { title: 'Slow exhale', detail: 'Breathe in for 4, then out for 8. Feel your heartbeat start to slow down.', icon: 'weather-windy' },
];

export const DIVE_REFLEX_NOTE =
  'Cold on your face triggers the mammalian dive reflex: your heart rate drops and your nervous system shifts into "rest" mode within seconds — taking the edge off an urge.';

export type TapeTone = 'giving_in' | 'riding_out' | 'reason';

export interface TapeCard {
  tone: TapeTone;
  title: string;
  body: string;
  icon: IconName;
}

/** "Play the tape forward" — first the relapse movie, then the recovery movie. */
export const TAPE_CARDS: TapeCard[] = [
  {
    tone: 'giving_in',
    title: 'Imagine giving in right now…',
    body: 'Picture it honestly. The first few seconds of relief. Is it really as good as the craving promises?',
    icon: 'play-circle-outline',
  },
  {
    tone: 'giving_in',
    title: '5 minutes later…',
    body: 'The relief is already fading. What are you feeling now — guilt, disappointment, the urge for more?',
    icon: 'clock-outline',
  },
  {
    tone: 'giving_in',
    title: 'Tomorrow morning…',
    body: 'You wake up and remember. Your counter is back at zero. How does that morning feel?',
    icon: 'weather-sunset-up',
  },
  {
    tone: 'riding_out',
    title: 'Now imagine riding it out…',
    body: 'The urge peaks, then slowly fades. You are still here, still in control. Nothing bad happened.',
    icon: 'waves',
  },
  {
    tone: 'riding_out',
    title: 'Tomorrow morning you wake up proud…',
    body: 'Clear head, one more day on the counter. You kept a promise to yourself — and it gets easier from here.',
    icon: 'weather-sunny',
  },
  {
    tone: 'reason',
    title: 'Remember why you started',
    body: 'You chose this for a reason. Write down how you want tomorrow to feel.',
    icon: 'heart-outline',
  },
];
