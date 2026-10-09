import { bubbleSize } from '../layout';

const fit = (width: number) => bubbleSize({ width, count: 5, gap: 12, max: 52, min: 34 });

describe('bubbleSize', () => {
  it('uses the full size when there is room', () => {
    expect(fit(310)).toBe(52);
    expect(fit(500)).toBe(52);
  });

  it('shrinks so five bubbles stay on one row on narrow phones', () => {
    for (const width of [303, 295, 280, 240]) {
      const size = fit(width);
      expect(size).toBeLessThan(52);
      expect(5 * size + 4 * 12).toBeLessThanOrEqual(width);
    }
  });

  it('never goes below the minimum tap size', () => {
    expect(fit(120)).toBe(34);
  });

  it('falls back to the full size before the row is measured', () => {
    expect(fit(0)).toBe(52);
    expect(fit(Number.NaN)).toBe(52);
  });
});
