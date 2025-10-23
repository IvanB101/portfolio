import { Vec, type Mat } from "./math";

function getWtC({ forward, up, pos }: PerspectiveCamera): Mat<4, 4> {
  let w = Vec.normalize<3>(forward);
  let u = Vec.normalize<3>(Vec.cross(w, up));
  let v = Vec.cross(u, w);

  return [
    [u[0], v[0], w[0], 0],
    [u[1], v[1], w[1], 0],
    [u[2], v[2], w[2], 0],
    [-Vec.dot<3>(pos, u), -Vec.dot<3>(pos, v), -Vec.dot<3>(pos, w), 1],
  ];
}

function getProj({ fov, aspect, far, near }: PerspectiveCamera): Mat<4, 4> {
  let tanHalfFov = Math.tan(fov / 2);

  return [
    [1 / (aspect * tanHalfFov), 0, 0, 0],
    [0, 1 / tanHalfFov, 0, 0],
    [0, 0, far / (far - near), 1],
    [0, 0, -(far * near) / (far - near), 0],
  ];
}

export class PerspectiveCamera {
  pos: Vec<3>;
  forward: Vec<3>;
  up: Vec<3>;
  near: number;
  far: number;
  fov: number;
  aspect: number;
  WtC: Mat<4, 4>;
  P: Mat<4, 4>;

  constructor({
    pos,
    forward,
    up,
    near,
    far,
    fov,
    aspect,
  }: {
    pos?: Vec<3>;
    forward?: Vec<3>;
    up?: Vec<3>;
    near?: number;
    far?: number;
    fov?: number;
    aspect?: number;
  }) {
    this.pos = pos || [0, 0, 0];
    this.forward = forward || [0, 0, 0];
    this.up = up || [0, 1, 0];
    this.near = near || 0.1;
    this.far = far || 20;
    this.fov = fov || Math.PI / 2;
    this.aspect = aspect || 16 / 9;
    this.WtC = getWtC(this);
    this.P = getProj(this);
  }

  update() {
    this.WtC = getWtC(this);
  }

  updateProj() {
    this.P = getProj(this);
  }
}
