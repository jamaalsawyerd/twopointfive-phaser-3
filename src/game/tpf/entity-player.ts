/**
 * Player entity: input (keyboard + mouse look), movement, camera, weapon, health. Receives _scene
 * from MainScene for damage indicator, death anim, and HUD updates. Camera rotation uses _smoothedAngle for smooth turning.
 */
import TPFEntity from '~/twopointfive/entity.ts';
import type Weapon from './weapon.ts';
import type { EntityContext } from '~/twopointfive/types.ts';

interface PlayerCursors {
  forward: { isDown: boolean };
  back: { isDown: boolean };
  left: { isDown: boolean };
  right: { isDown: boolean };
  stepleft: { isDown: boolean };
  stepright: { isDown: boolean };
  shoot: { isDown: boolean };
}

class EntityPlayer extends TPFEntity {
  angle: number;
  internalAngle: number;
  turnSpeed: number;
  moveSpeed: number;
  bob: number;
  bobSpeed: number;
  bobHeight: number;
  maxHealth: number;

  _mouseDeltaX: number;
  _mouseDown: boolean;
  _smoothedAngle: number;

  weapons: Weapon[];
  currentWeapon: Weapon | null;
  currentWeaponIndex: number;
  delayedWeaponSwitchIndex: number;

  _hurtSounds: { play(): void }[];
  _scene: {
    showDamageIndicator(): void;
    showDeathAnim(): void;
    onPlayerHealthChanged?(health: number): void;
    updateAmmoDisplay?(ammo: number): void;
  } | null;
  _cursors: PlayerCursors | null;
  god: boolean;

  constructor(x: number, y: number, _settings: Record<string, unknown> | null, context: Partial<EntityContext> | null) {
    super(x, y, _settings, context);
    this.type = TPFEntity.TYPE.A;
    this.collides = TPFEntity.COLLIDES.PASSIVE;
    this.size = { x: 32, y: 32 };
    this.angle = 0;
    this.internalAngle = 0;
    this.turnSpeed = (120 * Math.PI) / 180;
    this.moveSpeed = 192;
    this.bob = 0;
    this.bobSpeed = 0.1;
    this.bobHeight = 0.8;

    this.health = 100;
    this.maxHealth = 100;

    this._mouseDeltaX = 0;
    this._mouseDown = false;
    this._smoothedAngle = 0;

    this.weapons = [];
    this.currentWeapon = null;
    this.currentWeaponIndex = -1;
    this.delayedWeaponSwitchIndex = -1;

    this._hurtSounds = [];
    this._scene = null;
    this._cursors = null;
    this.god = false;
  }

  ready(): void {
    const ctx = this.context;
    if (ctx.camera) {
      ctx.camera.setPosition(this.pos.x + this.size.x / 2, this.pos.y + this.size.y / 2, 0);
    }
  }

  giveWeapon(weapon: Weapon): void {
    for (let i = 0; i < this.weapons.length; i++) {
      if (this.weapons[i].constructor === weapon.constructor) {
        this.weapons[i].giveAmmo(weapon.ammo);
        this.switchWeapon(i);
        return;
      }
    }
    this.weapons.push(weapon);
    this.switchWeapon(this.weapons.length - 1);
  }

  switchWeapon(index: number): void {
    if (this.currentWeapon) {
      if (this.currentWeapon.shootTimer.delta() < 0) {
        this.delayedWeaponSwitchIndex = index;
        return;
      }
    }
    this.delayedWeaponSwitchIndex = -1;
    this.currentWeaponIndex = index;
    this.currentWeapon = this.weapons[index];
    this._scene?.updateAmmoDisplay?.(this.currentWeapon?.ammo ?? 0);
  }

  giveAmmo(amount: number): void {
    if (this.currentWeapon) this.currentWeapon.giveAmmo(amount);
  }

  giveHealth(amount: number): boolean {
    if (this.health >= this.maxHealth) return false;
    this.health = Math.min(this.health + amount, this.maxHealth);
    this._scene?.onPlayerHealthChanged?.(this.health);
    return true;
  }

  receiveDamage(amount: number, _from: TPFEntity): void {
    if (this.god || this._killed) return;
    if (this._hurtSounds.length > 0) {
      const idx = Math.floor(Math.random() * this._hurtSounds.length);
      this._hurtSounds[idx].play();
    }
    if (this._scene) {
      this._scene.showDamageIndicator();
    }
    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.kill();
    }
    this._scene?.onPlayerHealthChanged?.(this.health);
  }

  kill(): void {
    if (this._scene) {
      this._scene.showDeathAnim();
    }
    this._killed = true;
  }

  switchToNextNonEmptyWeapon(): void {
    for (let i = this.currentWeaponIndex + 1; i < this.weapons.length; i++) {
      if (!this.weapons[i].depleted()) {
        this.switchWeapon(i);
        this.currentWeapon!.shootTimer.set(0.5);
        return;
      }
    }
    for (let j = 0; j < this.currentWeaponIndex; j++) {
      if (!this.weapons[j].depleted()) {
        this.switchWeapon(j);
        this.currentWeapon!.shootTimer.set(0.5);
        return;
      }
    }
  }

  update(): void {
    const ctx = this.context;
    if (!ctx?.camera) return;
    if (this._killed) return;
    const tick = ctx.tick || 1 / 60;
    let dx = 0,
      dy = 0;
    const cursors = this._cursors;
    if (cursors) {
      if (cursors.forward.isDown) dy = 1;
      if (cursors.back.isDown) dy = -1;
      if (cursors.left.isDown) this.internalAngle += this.turnSpeed * tick;
      if (cursors.right.isDown) this.internalAngle -= this.turnSpeed * tick;
      if (cursors.stepleft.isDown) dx = 1;
      if (cursors.stepright.isDown) dx = -1;
    }

    this.internalAngle -= this._mouseDeltaX / 400; // sensitivity divisor (pixels to radians)
    this._mouseDeltaX = 0;

    this.angle = this.internalAngle;

    // Shortest-path wrap so lerp doesn't spin the long way around -π/π boundary.
    let diff = this.internalAngle - this._smoothedAngle;
    while (diff > Math.PI) diff -= 2 * Math.PI;
    while (diff < -Math.PI) diff += 2 * Math.PI;
    this._smoothedAngle += diff * Math.min(1, tick * 40); // 40 rad/s catch-up for camera
    if (Math.abs(dx) + Math.abs(dy) > 1) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }
    this.vel.x = -Math.sin(this.angle) * dy * this.moveSpeed - Math.sin(this.angle + Math.PI / 2) * dx * this.moveSpeed;
    this.vel.y = -Math.cos(this.angle) * dy * this.moveSpeed - Math.cos(this.angle + Math.PI / 2) * dx * this.moveSpeed;

    const shooting = cursors?.shoot.isDown || this._mouseDown;
    if (this.currentWeapon && shooting) {
      const sx = this.pos.x + this.size.x / 2 - Math.sin(this.angle) * 3;
      const sy = this.pos.y + this.size.y / 2 - Math.cos(this.angle) * 3;
      if (!this.currentWeapon.depleted()) {
        this.currentWeapon.trigger(sx, sy, this.angle);
      } else {
        this.switchToNextNonEmptyWeapon();
      }
    }

    if (this.delayedWeaponSwitchIndex >= 0) {
      this.switchWeapon(this.delayedWeaponSwitchIndex);
    }

    super.update();

    const speed = this.moveSpeed;
    this.bob += tick * this.bobSpeed * Math.min(Math.abs(dx) + Math.abs(dy), 1) * speed;
    const bobOffset = Math.sin(this.bob) * this.bobHeight;

    if (this.currentWeapon && ctx.lightMap) {
      const lm = ctx.lightMap;
      const tx = Math.floor((this.pos.x + this.size.x / 2) / lm.tilesize);
      const ty = Math.floor((this.pos.y + this.size.y / 2) / lm.tilesize);
      this.currentWeapon.setLight(lm.getLight(tx, ty));
    }

    if (this.currentWeapon) {
      this.currentWeapon.bobOffset = Math.sin(this.bob + Math.PI / 2) * this.bobHeight * 4;
      this.currentWeapon.update();
    }

    const cx = this.pos.x + this.size.x / 2;
    const cy = this.pos.y + this.size.y / 2;
    ctx.camera.setPosition(cx, cy, bobOffset);
    ctx.camera.setRotation(0, 0, this._smoothedAngle);
  }
}

export default EntityPlayer;
