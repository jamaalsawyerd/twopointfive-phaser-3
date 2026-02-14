/**
 * Tile-based collision for entity movement. trace() returns final position and collision flags;
 * used by TPFEntity.update() and GameState._separateX/Y. Stepped per-tile for accuracy.
 * staticNoCollision is a no-op implementation used before a level is loaded.
 */
import type { TraceResult, CollisionMapLike } from './types.ts';

/** Tile grid (1 = solid); trace() advances a point by (vx, vy) and reports hits. */
class CollisionMap {
  tilesize: number;
  data: number[][];
  height: number;
  width: number;

  static staticNoCollision: CollisionMapLike = {
    tilesize: 64,
    trace(x: number, y: number, vx: number, vy: number): TraceResult {
      return {
        pos: { x: x + vx, y: y + vy },
        collision: { x: false, y: false, slope: false },
        tile: { x: 0, y: 0 },
      };
    },
  };

  constructor(tilesize: number, data: number[][]) {
    this.tilesize = tilesize;
    this.data = data;
    this.height = data.length;
    this.width = data[0] ? data[0].length : 0;
  }

  /** Advance (x,y) by (vx,vy) in steps of tilesize; return final pos and collision.x/y/slope. */
  trace(x: number, y: number, vx: number, vy: number, objectWidth: number, objectHeight: number): TraceResult {
    const res: TraceResult = {
      collision: { x: false, y: false, slope: false },
      pos: { x: x, y: y },
      tile: { x: 0, y: 0 },
    };

    const steps = Math.ceil((Math.max(Math.abs(vx), Math.abs(vy)) + 0.1) / this.tilesize);
    if (steps > 1) {
      let sx = vx / steps;
      let sy = vy / steps;

      for (let i = 0; i < steps && (sx || sy); i++) {
        this._traceStep(res, x, y, sx, sy, objectWidth, objectHeight, vx, vy, i);

        x = res.pos.x;
        y = res.pos.y;
        if (res.collision.x) {
          sx = 0;
          vx = 0;
        }
        if (res.collision.y) {
          sy = 0;
          vy = 0;
        }
        if (res.collision.slope) {
          break;
        }
      }
    } else {
      this._traceStep(res, x, y, vx, vy, objectWidth, objectHeight, vx, vy, 0);
    }

    return res;
  }

  _traceStep(
    res: TraceResult,
    x: number,
    y: number,
    vx: number,
    vy: number,
    width: number,
    height: number,
    _rvx: number,
    _rvy: number,
    step: number,
  ): void {
    res.pos.x += vx;
    res.pos.y += vy;

    let t = 0;

    // Horizontal collision (walls)
    if (vx) {
      const pxOffsetX = vx > 0 ? width : 0;
      const tileOffsetX = vx < 0 ? this.tilesize : 0;

      const firstTileY = Math.max(Math.floor(y / this.tilesize), 0);
      const lastTileY = Math.min(Math.ceil((y + height) / this.tilesize), this.height);
      const tileX = Math.floor((res.pos.x + pxOffsetX) / this.tilesize);

      let prevTileX = Math.floor((x + pxOffsetX) / this.tilesize);
      if (step > 0 || tileX === prevTileX || prevTileX < 0 || prevTileX >= this.width) {
        prevTileX = -1;
      }

      if (tileX >= 0 && tileX < this.width) {
        for (let tileY = firstTileY; tileY < lastTileY; tileY++) {
          t = this.data[tileY][tileX];
          if (t === 1) {
            res.collision.x = true;
            res.tile.x = t;
            x = res.pos.x = tileX * this.tilesize - pxOffsetX + tileOffsetX;
            break;
          }
        }
      }
    }

    // Vertical collision (floor, ceiling)
    if (vy) {
      const pxOffsetY = vy > 0 ? height : 0;
      const tileOffsetY = vy < 0 ? this.tilesize : 0;

      const firstTileX = Math.max(Math.floor(res.pos.x / this.tilesize), 0);
      const lastTileX = Math.min(Math.ceil((res.pos.x + width) / this.tilesize), this.width);
      const tileY = Math.floor((res.pos.y + pxOffsetY) / this.tilesize);

      let prevTileY = Math.floor((y + pxOffsetY) / this.tilesize);
      if (step > 0 || tileY === prevTileY || prevTileY < 0 || prevTileY >= this.height) {
        prevTileY = -1;
      }

      if (tileY >= 0 && tileY < this.height) {
        for (let tileX2 = firstTileX; tileX2 < lastTileX; tileX2++) {
          t = this.data[tileY][tileX2];
          if (t === 1) {
            res.collision.y = true;
            res.tile.y = t;
            res.pos.y = tileY * this.tilesize - pxOffsetY + tileOffsetY;
            break;
          }
        }
      }
    }
  }
}

export default CollisionMap;
