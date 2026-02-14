import type Renderer from './renderer/renderer.ts';

export interface ExpandSeamsResult {
  texture: WebGLTexture | null;
  textureWidth: number;
  textureHeight: number;
  width: number;
  height: number;
  seamsExpanded: boolean;
}

/**
 * Create WebGL texture from image/canvas. renderer.loadTexture(img).
 * expandSeams(tilesize): returns canvas with 1px border per tile to avoid seams.
 */
function expandSeams(
  imageOrCanvas: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  tilesize: number,
  renderer?: Renderer,
): ExpandSeamsResult {
  const img = imageOrCanvas;
  const tw = (img.width / tilesize) | 0;
  const th = (img.height / tilesize) | 0;
  const textureWidth = img.width + tw * 2 - 2;
  const textureHeight = img.height + th * 2 - 2;
  const canvas = typeof document !== 'undefined' && document.createElement('canvas');
  if (!canvas)
    return {
      texture: null,
      textureWidth: img.width,
      textureHeight: img.height,
      width: img.width,
      height: img.height,
      seamsExpanded: false,
    };
  canvas.width = textureWidth;
  canvas.height = textureHeight;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0, dy = -1; y < th; y++, dy += tilesize + 2) {
    for (let x = 0, dx = -1; x < tw; x++, dx += tilesize + 2) {
      if (dx > 0) {
        ctx.drawImage(img as CanvasImageSource, x * tilesize, y * tilesize, 1, tilesize, dx, dy + 1, 1, tilesize);
      }
      if (dx < img.width - tilesize) {
        ctx.drawImage(
          img as CanvasImageSource,
          (x + 1) * tilesize - 1,
          y * tilesize,
          1,
          tilesize,
          dx + tilesize + 1,
          dy + 1,
          1,
          tilesize,
        );
      }
      if (dy > 0) {
        ctx.drawImage(img as CanvasImageSource, x * tilesize, y * tilesize, tilesize, 1, dx, dy, tilesize + 2, 1);
        ctx.drawImage(img as CanvasImageSource, x * tilesize, y * tilesize, tilesize, 1, dx + 1, dy, tilesize, 1);
      }
      if (dy < img.height - tilesize) {
        ctx.drawImage(
          img as CanvasImageSource,
          x * tilesize,
          (y + 1) * tilesize - 1,
          tilesize,
          1,
          dx,
          dy + tilesize + 1,
          tilesize + 2,
          1,
        );
        ctx.drawImage(
          img as CanvasImageSource,
          x * tilesize,
          (y + 1) * tilesize - 1,
          tilesize,
          1,
          dx + 1,
          dy + tilesize + 1,
          tilesize,
          1,
        );
      }
      ctx.drawImage(
        img as CanvasImageSource,
        x * tilesize,
        y * tilesize,
        tilesize,
        tilesize,
        dx + 1,
        dy + 1,
        tilesize,
        tilesize,
      );
    }
  }
  const texture = renderer ? renderer.loadTexture(canvas) : null;
  return {
    texture,
    textureWidth,
    textureHeight,
    width: img.width,
    height: img.height,
    seamsExpanded: true,
  };
}

export { expandSeams };
