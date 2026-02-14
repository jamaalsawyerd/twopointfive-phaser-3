/**
 * Per-tile lighting: grid of RGB colors from a tileset image. Applied to Map/WallMap tiles and entities.
 * getLight(tx, ty) used by TPFEntity.updateQuad() for dynamicLight.
 */
import type { Color } from '~/twopointfive/types.ts';

/** Pixel data (e.g. from canvas getImageData) for building the light grid. */
export interface LightMapPixels {
  data: Uint8ClampedArray | number[];
  width?: number;
  height?: number;
}

/** Grid of colors; tile indices in data reference imagePixels samples. */
class LightMap {
  tilesize: number;
  height: number;
  width: number;
  white: Color;
  data: Color[][];

  constructor(tilesize: number, data: number[][], imagePixels: LightMapPixels) {
    this.tilesize = tilesize;
    this.height = data.length;
    this.width = data[0] ? data[0].length : 0;
    this.white = { r: 1, g: 1, b: 1 };

    const colors: Color[] = [];
    if (imagePixels?.data) {
      const px = imagePixels.data;
      const imgW = imagePixels.width || 0;
      const imgH = imagePixels.height || 0;
      for (let y = 0; y < imgH; y += tilesize) {
        for (let x = 0; x < imgW; x += tilesize) {
          const index = (y * imgW + x) * 4;
          colors.push({
            r: (px[index] || 0) / 255,
            g: (px[index + 1] || 0) / 255,
            b: (px[index + 2] || 0) / 255,
          });
        }
      }
    }

    // Convert number[][] to Color[][]
    this.data = data.map((row) => row.slice()) as unknown as Color[][];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const tile = data[y][x];
        (this.data[y] as unknown as Color[])[x] = tile && colors[tile - 1] ? colors[tile - 1] : this.white;
      }
    }
  }

  getLight(x: number, y: number): Color {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      return this.data[y][x];
    }
    return this.white;
  }
}

export default LightMap;
