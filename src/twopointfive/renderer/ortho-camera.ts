/**
 * Orthographic camera for HUD/UI overlay (e.g. weapon sprite). Fixed size; no perspective.
 * Used by the plugin as hudCamera when drawing the weapon on top of the 2.5D view.
 */
import { mat4 } from 'gl-matrix';

/** Ortho projection; view is identity. */
class OrthoCamera {
  _projection: mat4;
  _view: mat4;
  aspect: number;
  width: number;
  height: number;
  depthTest: boolean;

  constructor(width: number, height: number) {
    this._projection = mat4.create();
    this._view = mat4.create();
    mat4.ortho(this._projection, 0, width, height, 0, -1000, 1000);
    this.aspect = width / height;
    this.width = width;
    this.height = height;
    this.depthTest = false;
  }

  updateProjection(width: number, height: number): void {
    mat4.ortho(this._projection, 0, width, height, 0, -1000, 1000);
    this.aspect = width / height;
    this.width = width;
    this.height = height;
  }

  projection(): mat4 {
    return this._projection;
  }

  view(): mat4 {
    return this._view;
  }
}

export default OrthoCamera;
