/**
 * Short-lived particle: random initial velocity, lifetime and fade-out (idleTimer), then kill().
 * Used for blob gibs and explosion debris. Alpha driven by idleTimer.delta(), not ctx.tick.
 */
import TPFEntity from '~/twopointfive/entity.ts';
import TPFTimer from '~/twopointfive/timer.ts';
import type { EntityContext } from '~/twopointfive/types.ts';

class EntityParticle extends TPFEntity {
  lifetime: number;
  fadetime: number;
  initialVel: { x: number; y: number; z: number };
  idleTimer: TPFTimer | null;

  constructor(x: number, y: number, _settings: Record<string, unknown> | null, context: Partial<EntityContext> | null) {
    super(x, y, _settings, context);
    this.size = { x: 1, y: 1 };
    this.minBounceVelocity = 0;
    this.lifetime = 5;
    this.fadetime = 1;
    this.bounciness = 0.6;
    this.friction = { x: 20, y: 0 };
    this.initialVel = { x: 1, y: 1, z: 1 };
    this.dynamicLight = false;
    this.idleTimer = null;
  }

  init(x: number, y: number, settings: Record<string, unknown> | null): void {
    super.init(x, y, settings);
    if (this.currentAnim) this.currentAnim.gotoRandomFrame();
    this._setParticleVelocity();
  }

  reset(x: number | null, y: number | null, settings?: Record<string, unknown>): void {
    super.reset(x, y, settings);
    this._setParticleVelocity();
  }

  _setParticleVelocity(): void {
    this.vel.x = (Math.random() * 2 - 1) * this.initialVel.x;
    this.vel.y = (Math.random() * 2 - 1) * this.initialVel.y;
    this.vel.z = (Math.random() * 2 - 1) * this.initialVel.z;
    this.idleTimer = new TPFTimer();
  }

  update(): void {
    if (!this.idleTimer) {
      super.update();
      return;
    }

    const delta = this.idleTimer.delta();
    if (delta > this.lifetime) {
      this.kill();
      return;
    }

    const fadeStart = this.lifetime - this.fadetime;
    let alpha: number;
    if (delta <= fadeStart) {
      alpha = 1;
    } else if (delta >= this.lifetime) {
      alpha = 0;
    } else {
      alpha = 1 - (delta - fadeStart) / this.fadetime;
    }
    alpha = Math.max(0, Math.min(1, alpha));

    if (this.tile) {
      this.tile.quad.setAlpha(alpha);
    }

    super.update();
  }
}

export default EntityParticle;
