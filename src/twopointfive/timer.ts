/**
 * Real-time timer matching Impact's ig.Timer semantics.
 * delta() returns negative while counting down, 0 at expiry, positive after.
 * Uses performance.now() as the clock source.
 */
class TPFTimer {
  target: number;
  base: number;

  constructor(duration?: number) {
    this.target = duration || 0;
    this.base = TPFTimer.time();
  }

  /**
   * Returns elapsed time minus target.
   * Negative = still counting down, positive = timer has elapsed.
   */
  delta(): number {
    return TPFTimer.time() - this.base - this.target;
  }

  /**
   * Set a new countdown duration and reset the base time.
   */
  set(duration?: number): void {
    this.target = duration || 0;
    this.base = TPFTimer.time();
  }

  /**
   * Restart the timer with the same target duration.
   */
  reset(): void {
    this.base = TPFTimer.time();
  }

  /**
   * Current time in seconds.
   */
  static time(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now() / 1000;
    }
    return Date.now() / 1000;
  }
}

export default TPFTimer;
