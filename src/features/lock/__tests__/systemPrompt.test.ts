import { beginSystemPrompt, endSystemPrompt, isSystemPromptActive, withSystemPrompt } from '../systemPrompt';

describe('system prompt marker', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('stays active for a short tail after the prompt closes', () => {
    expect(isSystemPromptActive()).toBe(false);
    beginSystemPrompt();
    expect(isSystemPromptActive()).toBe(true);
    endSystemPrompt();
    expect(isSystemPromptActive()).toBe(true);
    jest.advanceTimersByTime(600);
    expect(isSystemPromptActive()).toBe(false);
  });

  it('handles overlapping prompts', () => {
    beginSystemPrompt();
    beginSystemPrompt();
    endSystemPrompt();
    jest.advanceTimersByTime(600);
    expect(isSystemPromptActive()).toBe(true);
    endSystemPrompt();
    jest.advanceTimersByTime(600);
    expect(isSystemPromptActive()).toBe(false);
  });

  it('wraps an async prompt, also when it throws', async () => {
    const seen: boolean[] = [];
    await withSystemPrompt(async () => {
      seen.push(isSystemPromptActive());
    });
    await expect(
      withSystemPrompt(async () => {
        throw new Error('denied');
      }),
    ).rejects.toThrow('denied');
    expect(seen).toEqual([true]);
    jest.advanceTimersByTime(600);
    expect(isSystemPromptActive()).toBe(false);
  });
});
