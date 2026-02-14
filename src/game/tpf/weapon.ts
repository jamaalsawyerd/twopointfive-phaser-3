import TPFTimer from '~/twopointfive/timer.ts';
import Animation from './animation.ts';
import { HudTile } from '~/twopointfive/world/tile.ts';
import type Renderer from '~/twopointfive/renderer/renderer.ts';
import type GameState from '~/twopointfive/game.ts';
import type { ImageInfo, Color } from '~/twopointfive/types.ts';

export interface WeaponOpts {
  ammo?: number;
  image?: ImageInfo | null;
  tileWidth?: number;
  tileHeight?: number;
  renderer?: Renderer | null;
  hudWidth?: number;
  hudHeight?: number;
  gameState?: GameState | null;
  sounds?: Record<string, { play(): void }>;
  ammoIconImage?: ImageInfo | null;
  onAmmoChange?: (ammo: number) => void;
  [key: string]: unknown;
}

/**
 * Weapon base class. Port of Impact's Weapon.
 */
class Weapon {
  offset: { x: number; y: number };
  offsetAngle: number;
  projectileOffset: number;
  pos: { x: number; y: number };
  bobOffset: number;

  tile: HudTile | null;
  ammo: number;
  maxAmmo: number;
  anims: Record<string, Animation>;
  currentAnim: Animation | null;

  cooldown: number;
  shootTimer: TPFTimer;
  ammoIcon: HudTile | null;

  currentQuadColor: Color;
  flashQuadColor: Color;
  unsetFlashTimer: TPFTimer | null;

  image: ImageInfo | null;
  tileWidth: number;
  tileHeight: number;
  renderer: Renderer | null;
  hudWidth: number;
  hudHeight: number;

  gameState: GameState | null;
  sounds: Record<string, { play(): void }>;
  onAmmoChange: ((ammo: number) => void) | undefined;

  constructor(opts?: WeaponOpts) {
    opts = opts || {};

    this.offset = { x: 0, y: 48 };
    this.offsetAngle = 0;
    this.projectileOffset = 0;
    this.pos = { x: 0, y: 0 };
    this.bobOffset = 0;

    this.tile = null;
    this.ammo = opts.ammo || 0;
    this.maxAmmo = 100;
    this.anims = {};
    this.currentAnim = null;

    this.cooldown = 1;
    this.shootTimer = new TPFTimer();
    this.ammoIcon = null;

    this.currentQuadColor = { r: 1, g: 1, b: 1 };
    this.flashQuadColor = { r: 1, g: 1, b: 1 };
    this.unsetFlashTimer = null;

    this.image = opts.image || null;
    this.tileWidth = opts.tileWidth || 0;
    this.tileHeight = opts.tileHeight || 0;
    this.renderer = opts.renderer || null;
    this.hudWidth = opts.hudWidth || 640;
    this.hudHeight = opts.hudHeight || 480;

    this.gameState = opts.gameState || null;
    this.sounds = (opts.sounds || {}) as Record<string, { play(): void }>;
    this.onAmmoChange = opts.onAmmoChange;

    if (this.image && this.tileWidth) {
      this.tile = new HudTile(this.image, 0, this.tileWidth, this.tileHeight);
      this.pos.x = this.hudWidth / 2 - this.tileWidth / 2 - this.offset.x;
      this.pos.y = this.hudHeight - this.offset.y;
      this.tile.setPosition(this.pos.x, this.pos.y + this.bobOffset);
    }
  }

  addAnim(name: string, frameTime: number, sequence: number[], stop?: boolean): Animation {
    const a = new Animation(frameTime, sequence, stop);
    this.anims[name] = a;
    if (!this.currentAnim) {
      this.currentAnim = a;
    }
    return a;
  }

  trigger(x: number, y: number, angle: number): void {
    if (this.ammo > 0 && this.shootTimer.delta() > 0) {
      this.shootTimer.set(this.cooldown);
      this.ammo--;
      this.onAmmoChange?.(this.ammo);

      const offsetAngle = angle - Math.PI / 2;
      const sx = x - Math.sin(offsetAngle) * this.projectileOffset;
      const sy = y - Math.cos(offsetAngle) * this.projectileOffset;

      this.shoot(sx, sy, angle + this.offsetAngle);
    }
  }

  depleted(): boolean {
    return this.shootTimer.delta() > 0 && this.ammo <= 0;
  }

  giveAmmo(ammo: number): void {
    this.ammo = Math.min(this.maxAmmo, this.ammo + ammo);
    this.onAmmoChange?.(this.ammo);
  }

  shoot(_x: number, _y: number, _angle: number): void {
    // Override in subclass
  }

  setLight(color: Color): void {
    this.currentQuadColor = color;
    if (!this.tile) return;
    this.tile.quad.setColor(color);
  }

  flash(duration: number): void {
    if (!this.tile) return;
    this.tile.quad.setColor(this.flashQuadColor);
    this.unsetFlashTimer = new TPFTimer(duration);
  }

  update(): void {
    if (this.currentAnim) {
      this.currentAnim.update();
      if (this.tile) {
        this.tile.setTile(this.currentAnim.tile);
      }
    }

    if (this.tile) {
      this.tile.setPosition(this.pos.x, this.pos.y + this.bobOffset);
    }

    if (this.unsetFlashTimer && this.unsetFlashTimer.delta() > 0) {
      this.setLight(this.currentQuadColor);
      this.unsetFlashTimer = null;
    }
  }

  draw(renderer?: Renderer): void {
    const r = renderer || this.renderer;
    if (this.tile && r) {
      this.tile.draw(r);
    }
  }
}

export default Weapon;
