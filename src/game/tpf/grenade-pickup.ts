import TPFEntity from '~/twopointfive/entity.ts';
import type { EntityContext } from '~/twopointfive/types.ts';

class EntityGrenadePickup extends TPFEntity {
  amount: number;
  _pickupSound: { play(): void } | null;

  constructor(x: number, y: number, settings: Record<string, unknown> | null, context: Partial<EntityContext> | null) {
    super(x, y, settings, context);
    this.checkAgainst = TPFEntity.TYPE.A;
    this.size = { x: 16, y: 16 };
    this.scale = 0.5;
    this.amount = 8;
    this.dynamicLight = true;
    this._pickupSound = (settings && (settings.pickupSound as { play(): void })) || null;
  }

  init(x: number, y: number, settings: Record<string, unknown> | null): void {
    super.init(x, y, settings);
    this.addAnim('idle', 10, [0]);
  }

  check(other: TPFEntity): void {
    if ((other as unknown as { giveAmmo?: (amount: number) => void }).giveAmmo) {
      (other as unknown as { giveAmmo: (amount: number) => void }).giveAmmo(this.amount);
    }
    if (this._pickupSound) this._pickupSound.play();
    this.kill();
  }
}

export default EntityGrenadePickup;
