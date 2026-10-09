import { presetFor } from '@/domain/catalog/habits';
import { changeCurrency, NAME_MAX, validateHabitForm, valuesFromPreset, type HabitFormOutput, type HabitFormValues, type TouchedFields } from '@/features/habit-form/formModel';
import type { HabitKind } from '@/types';

export type OnboardingStep =
  | { kind: 'welcome' }
  | { kind: 'name' }
  | { kind: 'habits' }
  | { kind: 'config'; index: number }
  | { kind: 'reminders' }
  | { kind: 'finish' };

/** Top-level stages shown as progress dots (all config pages share one dot). */
export const STAGES = ['welcome', 'name', 'habits', 'config', 'reminders', 'finish'] as const;

/** Linear list of pages for the given number of selected habits (at least one config page is kept as a placeholder). */
export function buildSteps(habitCount: number): OnboardingStep[] {
  const configs: OnboardingStep[] = Array.from({ length: Math.max(1, habitCount) }, (_, index) => ({ kind: 'config', index }));
  return [{ kind: 'welcome' }, { kind: 'name' }, { kind: 'habits' }, ...configs, { kind: 'reminders' }, { kind: 'finish' }];
}

export function stepKey(step: OnboardingStep): string {
  return step.kind === 'config' ? `config-${step.index}` : step.kind;
}

/** Index of the step's stage in STAGES (for the dots). */
export function stageIndex(step: OnboardingStep): number {
  return STAGES.indexOf(step.kind);
}

/** Toggle a kind, keeping the order in which the user picked habits. */
export function toggleKind(selected: HabitKind[], kind: HabitKind): HabitKind[] {
  return selected.includes(kind) ? selected.filter((k) => k !== kind) : [...selected, kind];
}

export interface HabitDraft {
  values: HabitFormValues;
  touched: TouchedFields;
}

export interface SyncOptions {
  currency: string;
  now: number;
  customName: string;
}

/**
 * One draft per selected kind, in selection order. Existing drafts keep their
 * edits; new ones start from the preset in the preferred currency. The custom
 * habit takes the name typed on the picker page.
 */
export function syncDrafts(selected: HabitKind[], drafts: HabitDraft[], { currency, now, customName }: SyncOptions): HabitDraft[] {
  return selected.map((kind) => {
    const existing = drafts.find((d) => d.values.kind === kind);
    const draft: HabitDraft = existing ?? { values: valuesFromPreset(presetFor(kind), currency, now), touched: {} };
    if (kind === 'custom') return { ...draft, values: { ...draft.values, name: customName.trim() } };
    return draft;
  });
}

/**
 * The user changed currency on one draft: adopt it on every other draft whose
 * currency they haven't picked by hand (re-expressing untouched preset costs).
 */
export function propagateCurrency(drafts: HabitDraft[], fromIndex: number, currency: string): HabitDraft[] {
  return drafts.map((d, i) => {
    if (i === fromIndex) {
      return { values: changeCurrency(d.values, d.touched, currency, presetFor(d.values.kind)), touched: { ...d.touched, currency: true } };
    }
    if (d.touched.currency || d.values.currency === currency) return d;
    return { ...d, values: changeCurrency(d.values, d.touched, currency, presetFor(d.values.kind)) };
  });
}

/** Error for the custom habit name on the picker page, if any. */
export function customNameError(selected: HabitKind[], customName: string): string | undefined {
  if (!selected.includes('custom')) return undefined;
  const name = customName.trim();
  if (!name) return 'Name your custom habit.';
  if (name.length > NAME_MAX) return `Keep it under ${NAME_MAX} characters.`;
  return undefined;
}

/** Validate every draft; returns outputs or the index of the first invalid draft. */
export function finalizeDrafts(drafts: HabitDraft[], now: number): { outputs: HabitFormOutput[]; invalidIndex: number | null } {
  const outputs: HabitFormOutput[] = [];
  for (let i = 0; i < drafts.length; i++) {
    const { output } = validateHabitForm(drafts[i].values, now);
    if (!output) return { outputs: [], invalidIndex: i };
    outputs.push(output);
  }
  return { outputs, invalidIndex: null };
}

/** Friendly first name for greetings ("Kevin Kong" → "Kevin"). */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}
