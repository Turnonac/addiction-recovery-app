import { currentGoalDays, goalProgress, milestoneAfter, milestoneLabel, milestoneReached, milestonesReachedList } from '../milestones';
import { DAY } from '../time';

describe('milestones', () => {
  it('finds the next milestone', () => {
    expect(milestoneAfter(0)).toBe(1);
    expect(milestoneAfter(1)).toBe(3);
    expect(milestoneAfter(29)).toBe(30);
    expect(milestoneAfter(30)).toBe(60);
    expect(milestoneAfter(364)).toBe(365);
    expect(milestoneAfter(365)).toBe(730);
    expect(milestoneAfter(800)).toBe(1095);
  });

  it('finds the reached milestone', () => {
    expect(milestoneReached(0)).toBe(0);
    expect(milestoneReached(2)).toBe(1);
    expect(milestoneReached(30)).toBe(30);
    expect(milestoneReached(400)).toBe(365);
    expect(milestoneReached(731)).toBe(730);
    expect(milestonesReachedList(8)).toEqual([1, 3, 7]);
    expect(milestonesReachedList(731)).toEqual([1, 3, 7, 14, 30, 60, 90, 180, 365, 730]);
  });

  it('matches the original app progress math', () => {
    // Smoking: 29 days toward a 30-day goal → 96%
    expect(Math.floor(goalProgress(29 * DAY, currentGoalDays(29, null)) * 100)).toBe(96);
    // Alcohol: 30 days → next goal 60 → 50%
    expect(currentGoalDays(30, null)).toBe(60);
    expect(Math.floor(goalProgress(30 * DAY, 60) * 100)).toBe(50);
    // Coffee: 31 days → 51%
    expect(Math.floor(goalProgress(31 * DAY, currentGoalDays(31, null)) * 100)).toBe(51);
  });

  it('respects a user goal until it is reached', () => {
    expect(currentGoalDays(10, 45)).toBe(45);
    expect(currentGoalDays(45, 45)).toBe(60);
  });

  it('labels milestones', () => {
    expect(milestoneLabel(1)).toBe('1 day');
    expect(milestoneLabel(7)).toBe('1 week');
    expect(milestoneLabel(30)).toBe('1 month');
    expect(milestoneLabel(365)).toBe('1 year');
    expect(milestoneLabel(730)).toBe('2 years');
    expect(milestoneLabel(45)).toBe('45 days');
  });
});
