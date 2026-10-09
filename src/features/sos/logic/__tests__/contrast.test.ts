import { EXERCISES } from '@/domain/catalog/exercises';
import { AA_TEXT, contrastWithBlack, contrastWithWhite, labelToneOn, luminance, parseHex } from '../contrast';

describe('contrast', () => {
  it('parses hex colors', () => {
    expect(parseHex('#06B6D4')).toEqual([6, 182, 212]);
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('rgba(0,0,0,1)')).toBeNull();
  });

  it('computes WCAG luminance and ratios', () => {
    expect(luminance('#FFFFFF')).toBeCloseTo(1, 5);
    expect(luminance('#000000')).toBeCloseTo(0, 5);
    expect(contrastWithWhite('#000000')).toBeCloseTo(21, 1);
    expect(contrastWithBlack('#FFFFFF')).toBeCloseTo(21, 1);
    // The cases the review flagged: white on cyan / green is far below AA.
    expect(contrastWithWhite('#06B6D4')).toBeCloseTo(2.43, 1);
    expect(contrastWithWhite('#22C55E')).toBeCloseTo(2.28, 1);
  });

  it('keeps white when it is readable', () => {
    expect(labelToneOn('#1E3A8A')).toBe('light');
    expect(labelToneOn('#000000')).toBe('light');
  });

  it('switches to black on bright fills', () => {
    expect(labelToneOn('#06B6D4')).toBe('dark');
    expect(labelToneOn('#22C55E')).toBe('dark');
    expect(labelToneOn('#F59E0B')).toBe('dark');
  });

  it('checks every stop of a gradient', () => {
    // SOS gradient: orange → pink. White fails on the orange end.
    expect(labelToneOn(['#FF6A00', '#FF0050'])).toBe('dark');
    expect(labelToneOn(['#3B82F6', '#06B6D4'])).toBe('dark');
    // Neither tone is great on navy → cyan; white has the better worst case.
    expect(labelToneOn(['#1E3A8A', '#06B6D4'])).toBe('light');
    expect(labelToneOn([])).toBe('light');
  });

  it('gives every exercise color an AA-readable label', () => {
    for (const e of EXERCISES) {
      const tone = labelToneOn(e.color);
      const ratio = tone === 'light' ? contrastWithWhite(e.color) : contrastWithBlack(e.color);
      expect(ratio).toBeGreaterThanOrEqual(AA_TEXT);
    }
  });
});
