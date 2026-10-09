import { canInterrupt, isForeground } from '../presenceLogic';

describe('isForeground', () => {
  it('is false in the background and while inactive (app switcher, Face ID prompt)', () => {
    expect(isForeground('background')).toBe(false);
    expect(isForeground('inactive')).toBe(false);
  });

  it('is true when active or not reported yet', () => {
    expect(isForeground('active')).toBe(true);
    expect(isForeground('unknown')).toBe(true);
    expect(isForeground(null)).toBe(true);
  });
});

describe('canInterrupt', () => {
  it('without app lock: only needs the app in the foreground', () => {
    expect(canInterrupt({ appState: 'active', lockEnabled: false, settled: false })).toBe(true);
    expect(canInterrupt({ appState: 'inactive', lockEnabled: false, settled: true })).toBe(false);
    expect(canInterrupt({ appState: 'background', lockEnabled: false, settled: true })).toBe(false);
  });

  it('with app lock: waits for the settle window after coming to the foreground', () => {
    expect(canInterrupt({ appState: 'active', lockEnabled: true, settled: false })).toBe(false);
    expect(canInterrupt({ appState: 'active', lockEnabled: true, settled: true })).toBe(true);
    expect(canInterrupt({ appState: 'inactive', lockEnabled: true, settled: true })).toBe(false);
  });
});
