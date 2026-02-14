import TPFEntity from '~/twopointfive/entity.ts';
import type { EntityContext } from '~/twopointfive/types.ts';

class EntityVoid extends TPFEntity {
  constructor(x: number, y: number, _settings: Record<string, unknown> | null, context: Partial<EntityContext> | null) {
    super(x, y, _settings, context);
    this.size = { x: 32, y: 32 };
  }
  update(): void {}
}

export default EntityVoid;
