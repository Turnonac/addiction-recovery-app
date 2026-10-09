import type { IconName } from '@/types';

export interface ResourceAction {
  label: string;
  url: string;
  icon: IconName;
}

export interface CrisisResource {
  id: string;
  title: string;
  /** Short line under the title, e.g. "1-800-662-4357". */
  detail: string;
  description: string;
  icon: IconName;
  /** Theme color key used for the tile. */
  tone: 'danger' | 'info' | 'success' | 'purple';
  actions: ResourceAction[];
}

/** Digits-only "tel:" URL for a human-formatted phone number. */
export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function smsUrl(phone: string): string {
  return `sms:${phone.replace(/[^\d+]/g, '')}`;
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: 'emergency',
    title: 'Emergency services',
    detail: '911 (US) · 112 (EU) · 999 (UK)',
    description: 'If you or someone else is in immediate danger, contact your local emergency number right away.',
    icon: 'alarm-light-outline',
    tone: 'danger',
    actions: [],
  },
  {
    id: 'samhsa',
    title: 'SAMHSA National Helpline',
    detail: '1-800-662-4357',
    description: 'Free, confidential, 24/7 treatment referral and information service for substance use (US).',
    icon: 'phone-in-talk-outline',
    tone: 'info',
    actions: [{ label: 'Call', url: telUrl('1-800-662-4357'), icon: 'phone' }],
  },
  {
    id: '988',
    title: '988 Suicide & Crisis Lifeline',
    detail: 'Call or text 988 (US)',
    description: 'Free, confidential support for people in distress, any time of day or night.',
    icon: 'heart-pulse',
    tone: 'purple',
    actions: [
      { label: 'Call', url: telUrl('988'), icon: 'phone' },
      { label: 'Text', url: smsUrl('988'), icon: 'message-text-outline' },
    ],
  },
  {
    id: 'findahelpline',
    title: 'International helplines',
    detail: 'findahelpline.com',
    description: 'Find free, confidential crisis lines in your country.',
    icon: 'earth',
    tone: 'success',
    actions: [{ label: 'Open', url: 'https://findahelpline.com', icon: 'open-in-new' }],
  },
];
