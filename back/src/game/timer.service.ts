import { Injectable } from '@nestjs/common';

interface TimerState {
  remainingMs: number;
  intervalId: ReturnType<typeof setInterval> | null;
}

@Injectable()
export class TimerService {
  private readonly timers = new Map<string, TimerState>();

  start(
    code: string,
    durationMs: number,
    onTick: (remainingMs: number) => void,
    onExpiry: () => void,
  ): void {
    this.clear(code);
    const state: TimerState = { remainingMs: durationMs, intervalId: null };
    this.timers.set(code, state);

    state.intervalId = setInterval(() => {
      state.remainingMs -= 1000;
      if (state.remainingMs <= 0) {
        state.remainingMs = 0;
        this.clear(code);
        onExpiry();
      } else {
        onTick(state.remainingMs);
      }
    }, 1000);
  }

  pause(code: string): number {
    const state = this.timers.get(code);
    if (!state) return 0;
    if (state.intervalId !== null) {
      clearInterval(state.intervalId);
      state.intervalId = null;
    }
    return state.remainingMs;
  }

  resume(
    code: string,
    onTick: (remainingMs: number) => void,
    onExpiry: () => void,
  ): void {
    const state = this.timers.get(code);
    if (!state || state.intervalId !== null) return;

    state.intervalId = setInterval(() => {
      state.remainingMs -= 1000;
      if (state.remainingMs <= 0) {
        state.remainingMs = 0;
        this.clear(code);
        onExpiry();
      } else {
        onTick(state.remainingMs);
      }
    }, 1000);
  }

  clear(code: string): void {
    const state = this.timers.get(code);
    if (state?.intervalId !== null && state?.intervalId !== undefined) {
      clearInterval(state.intervalId);
    }
    this.timers.delete(code);
  }

  getRemainingMs(code: string): number {
    return this.timers.get(code)?.remainingMs ?? 0;
  }
}
