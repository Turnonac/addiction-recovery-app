import { AUTH_TYPE, lockMethodFrom, lockMethodIcon, lockMethodLabel, RELOCK_AFTER_MS, shouldRelock } from '../lockLogic';

describe('lockMethodFrom', () => {
  it('prefers face, then fingerprint, then iris', () => {
    expect(lockMethodFrom([AUTH_TYPE.FINGERPRINT, AUTH_TYPE.FACIAL_RECOGNITION], true)).toBe('face');
    expect(lockMethodFrom([AUTH_TYPE.FINGERPRINT], true)).toBe('fingerprint');
    expect(lockMethodFrom([AUTH_TYPE.IRIS], true)).toBe('iris');
  });

  it('falls back to passcode without enrolled biometrics', () => {
    expect(lockMethodFrom([AUTH_TYPE.FACIAL_RECOGNITION], false)).toBe('passcode');
    expect(lockMethodFrom([], true)).toBe('passcode');
  });
});

describe('lockMethodLabel / icon', () => {
  it('uses platform names', () => {
    expect(lockMethodLabel('face', 'ios')).toBe('Face ID');
    expect(lockMethodLabel('fingerprint', 'ios')).toBe('Touch ID');
    expect(lockMethodLabel('face', 'android')).toBe('Face Unlock');
    expect(lockMethodLabel('fingerprint', 'android')).toBe('Fingerprint');
    expect(lockMethodLabel('passcode', 'ios')).toBe('Passcode');
    expect(lockMethodLabel('iris', 'android')).toBe('Iris');
  });

  it('maps icons', () => {
    expect(lockMethodIcon('face')).toBe('face-recognition');
    expect(lockMethodIcon('fingerprint')).toBe('fingerprint');
    expect(lockMethodIcon('passcode')).toBe('lock-outline');
  });
});

describe('shouldRelock', () => {
  const t0 = 1_000_000;
  it('re-locks only after the grace period', () => {
    expect(shouldRelock(null, t0)).toBe(false);
    expect(shouldRelock(t0, t0 + RELOCK_AFTER_MS - 1)).toBe(false);
    expect(shouldRelock(t0, t0 + RELOCK_AFTER_MS)).toBe(true);
    expect(shouldRelock(t0, t0 + 5 * 60_000)).toBe(true);
  });

  it('accepts a custom threshold', () => {
    expect(shouldRelock(t0, t0 + 1000, 500)).toBe(true);
  });
});
