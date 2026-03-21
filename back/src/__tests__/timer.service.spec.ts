import { TimerService } from '../game/timer.service';

describe('TimerService', () => {
  let service: TimerService;

  beforeEach(() => {
    jest.useFakeTimers();
    service = new TimerService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('start', () => {
    it('calls onTick every second with decreasing remainingMs', () => {
      const onTick = jest.fn();
      const onExpiry = jest.fn();

      service.start('abc', 5000, onTick, onExpiry);

      jest.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledWith(4000);
      expect(onExpiry).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledWith(3000);
    });

    it('calls onExpiry when timer reaches 0 and stops ticking', () => {
      const onTick = jest.fn();
      const onExpiry = jest.fn();

      service.start('abc', 3000, onTick, onExpiry);
      jest.advanceTimersByTime(3000);

      expect(onExpiry).toHaveBeenCalledTimes(1);
      // No further ticks after expiry
      jest.advanceTimersByTime(2000);
      expect(onExpiry).toHaveBeenCalledTimes(1);
    });

    it('clears previous timer when called again with same code', () => {
      const onExpiry1 = jest.fn();
      const onExpiry2 = jest.fn();

      service.start('abc', 2000, jest.fn(), onExpiry1);
      service.start('abc', 5000, jest.fn(), onExpiry2); // restarts

      jest.advanceTimersByTime(2000);
      expect(onExpiry1).not.toHaveBeenCalled(); // old timer was cleared
      expect(onExpiry2).not.toHaveBeenCalled(); // new timer has 3s left
    });
  });

  describe('pause', () => {
    it('stops ticking and returns remaining ms', () => {
      const onTick = jest.fn();
      service.start('abc', 5000, onTick, jest.fn());
      jest.advanceTimersByTime(2000);

      const remaining = service.pause('abc');
      expect(remaining).toBe(3000);

      jest.advanceTimersByTime(2000);
      // No new ticks after pause
      expect(onTick).toHaveBeenCalledTimes(2); // only 2 ticks before pause
    });

    it('returns 0 when pausing a non-existent code', () => {
      expect(service.pause('unknown')).toBe(0);
    });
  });

  describe('resume', () => {
    it('continues counting from paused value', () => {
      const onTick = jest.fn();
      const onExpiry = jest.fn();

      service.start('abc', 5000, onTick, onExpiry);
      jest.advanceTimersByTime(2000); // 3000 remaining
      service.pause('abc');

      service.resume('abc', onTick, onExpiry);
      jest.advanceTimersByTime(3000);

      expect(onExpiry).toHaveBeenCalledTimes(1);
    });

    it('does nothing if already running', () => {
      const onTick = jest.fn();
      service.start('abc', 5000, onTick, jest.fn());
      service.resume('abc', jest.fn(), jest.fn()); // no-op

      jest.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledTimes(1); // only one interval running
    });
  });

  describe('clear', () => {
    it('stops the timer without calling onExpiry', () => {
      const onExpiry = jest.fn();
      service.start('abc', 3000, jest.fn(), onExpiry);
      service.clear('abc');
      jest.advanceTimersByTime(5000);
      expect(onExpiry).not.toHaveBeenCalled();
    });

    it('is safe to call on a non-existent code', () => {
      expect(() => service.clear('unknown')).not.toThrow();
    });
  });

  describe('getRemainingMs', () => {
    it('returns remaining ms while running', () => {
      service.start('abc', 5000, jest.fn(), jest.fn());
      jest.advanceTimersByTime(2000);
      expect(service.getRemainingMs('abc')).toBe(3000);
    });

    it('returns 0 for unknown code', () => {
      expect(service.getRemainingMs('unknown')).toBe(0);
    });
  });
});
