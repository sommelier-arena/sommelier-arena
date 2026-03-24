import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimerManager } from '../../../../back/timer';

let clock: ReturnType<typeof vi.useFakeTimers> | undefined;

describe('TimerManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down and calls onTick/onExpiry', () => {
    const timer = new TimerManager();
    const ticks: number[] = [];
    const onTick = (ms: number) => ticks.push(ms);
    const onExpiry = vi.fn();

    timer.start(3, onTick, onExpiry); // 3 seconds
    // advance 1s
    vi.advanceTimersByTime(1000);
    expect(ticks[0]).toBe(2000);

    vi.advanceTimersByTime(2000);
    expect(onExpiry).toHaveBeenCalled();
    expect(timer.remainingMs).toBe(0);
  });

  it('pause returns remaining ms and resume continues', () => {
    const timer = new TimerManager();
    const onTick = vi.fn();
    const onExpiry = vi.fn();

    timer.start(5, onTick, onExpiry);
    vi.advanceTimersByTime(2000);
    const rem = timer.pause();
    expect(rem).toBe(3000);

    timer.resume(rem, onTick, onExpiry);
    vi.advanceTimersByTime(3000);
    expect(onExpiry).toHaveBeenCalled();
  });
});
