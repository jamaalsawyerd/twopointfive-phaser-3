/**
 * HUD damage indicator: shows a blood splat that fades out. Uses Phaser tweens so the scene
 * update loop does not need to drive the fade. MainScene creates one and calls show() from showDamageIndicator().
 */
import type Phaser from 'phaser';

/** Options for the blood overlay (view size and fade duration). */
export interface HudBloodOptions {
  viewWidth?: number;
  viewHeight?: number;
  fadeDurationMs?: number;
}

export class HudBlood {
  private _scene: Phaser.Scene;
  private _image: Phaser.GameObjects.Image;
  private _viewWidth: number;
  private _viewHeight: number;
  private _fadeDurationMs: number;

  constructor(scene: Phaser.Scene, options?: HudBloodOptions) {
    this._scene = scene;
    this._viewWidth = options?.viewWidth ?? 640;
    this._viewHeight = options?.viewHeight ?? 480;
    this._fadeDurationMs = options?.fadeDurationMs ?? 1000;
    this._image = scene.add.image(0, 0, 'hud-blood').setOrigin(0, 0).setScrollFactor(0).setDepth(999).setAlpha(0);
  }

  show(): void {
    const x = Math.random() * (this._viewWidth - 160);
    const y = Math.random() * (this._viewHeight - 120);
    this._image.setPosition(x, y);
    this._image.setAlpha(1);
    this._scene.tweens.killTweensOf(this._image);
    this._scene.tweens.add({
      targets: this._image,
      alpha: 0,
      duration: this._fadeDurationMs,
      ease: 'Linear',
    });
  }
}
