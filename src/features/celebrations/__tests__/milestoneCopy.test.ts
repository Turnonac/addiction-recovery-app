import { hasCertificate, milestoneMessage, milestoneShareText, milestoneTitle } from '../milestoneCopy';

describe('milestone copy', () => {
  it('has a line for every standard milestone', () => {
    for (const d of [1, 3, 7, 14, 30, 60, 90, 180, 365]) expect(milestoneMessage(d).length).toBeGreaterThan(20);
    expect(milestoneMessage(730)).toMatch(/^2 years free/);
    expect(milestoneMessage(45)).toMatch(/milestone/);
  });

  it('builds titles and share text', () => {
    expect(milestoneTitle(30, 'Alcohol')).toBe('1 month free from Alcohol!');
    expect(milestoneTitle(1, 'Coffee')).toBe('1 day free from Coffee!');
    expect(milestoneShareText(7, 'Smoking')).toContain('1 week free from Smoking');
  });

  it('knows which milestones award certificates', () => {
    expect(hasCertificate(30)).toBe(true);
    expect(hasCertificate(14)).toBe(false);
    expect(hasCertificate(365)).toBe(true);
  });
});
