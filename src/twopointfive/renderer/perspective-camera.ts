import { vec3, mat4 } from 'gl-matrix';

class PerspectiveCamera {
  _projection: mat4;
  _view: mat4;
  position: vec3;
  rotation: vec3;
  aspect: number;
  depthTest: boolean;

  constructor(fov: number, aspect: number, near: number, far: number) {
    this._projection = mat4.create();
    this._view = mat4.create();
    this.position = vec3.create();
    this.rotation = vec3.create();
    const fovRad = typeof fov === 'number' && fov.toRad ? fov.toRad() : fov;
    mat4.perspective(this._projection, fovRad, aspect, near, far);
    this.aspect = aspect;
    this.depthTest = true;
  }

  setRotation(x: number, y: number, z: number): void {
    this.rotation[0] = x;
    this.rotation[1] = z;
    this.rotation[2] = y;
  }

  setPosition(x: number, y: number, z: number): void {
    this.position[0] = x;
    this.position[1] = z;
    this.position[2] = y;
  }

  updateProjection(fov: number, aspect: number, near: number, far: number): void {
    const fovRad = typeof fov === 'number' && fov.toRad ? fov.toRad() : fov;
    mat4.perspective(this._projection, fovRad, aspect, near, far);
    this.aspect = aspect;
  }

  projection(): mat4 {
    return this._projection;
  }

  view(): mat4 {
    const m = this._view;
    const rot = this.rotation;
    mat4.identity(m);
    if (rot[2]) mat4.rotateZ(m, m, -rot[2]);
    if (rot[0]) mat4.rotateX(m, m, -rot[0]);
    if (rot[1]) mat4.rotateY(m, m, -rot[1]);
    mat4.translate(m, m, [-this.position[0], -this.position[1], -this.position[2]]);
    return m;
  }
}

export default PerspectiveCamera;
