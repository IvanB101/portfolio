export type Tuple<
  T,
  N extends number,
  R extends unknown[] = [],
> = R["length"] extends N ? R : Tuple<T, N, [T, ...R]>;
export type Vec<N extends number> = Tuple<number, N>;
export type Mat<C extends number, R extends number> = Tuple<Vec<R>, C>;

export const Vec = {
  scale: function <N extends number>(vec: Vec<N>, scalar: number): Vec<N> {
    return (vec as number[]).map((n) => n * scalar) as Vec<N>;
  },

  len: function <N extends number>(vec: Vec<N>): number {
    let v = vec as number[];
    let sum = 0;
    for (let i = 0; i < v.length; i++) {
      sum += v[i] * v[i];
    }
    return Math.sqrt(sum);
  },

  normalize: function <N extends number>(vec: Vec<N>): Vec<N> {
    return this.scale<N>(vec, 1 / this.len<N>(vec));
  },

  cross: function (a: Vec<3>, b: Vec<3>): Vec<3> {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
  },

  dot: function <N extends number>(a: Vec<N>, b: Vec<N>) {
    let ret = 0;
    for (let i = 0; i < (a as number[]).length; i++) {
      ret += (a as number[])[i] * (b as number[])[i];
    }
    return ret;
  },
};

export const Mat = {
  fromValue: function <N extends number>(val: number, n: N): Mat<N, N> {
    let ret = [];

    for (let i = 0; i < n; i++) {
      let row = [];
      for (let j = 0; j < n; j++) {
        row.push(i == j ? val : 0);
      }
      ret.push(row);
    }
    return ret as Mat<N, N>;
  },

  identity: function <N extends number>(n: N): Mat<N, N> {
    return this.fromValue(1, n);
  },

  fromDiagonal: function <N extends number>(vec: Vec<N>): Mat<N, N> {
    let ret = [];
    const n = (vec as number[]).length;

    for (let i = 0; i < n; i++) {
      let row = [];
      for (let j = 0; j < n; j++) {
        row.push(i == j ? (vec as number[])[i] : 0);
      }
      ret.push(row);
    }
    return ret as Mat<N, N>;
  },

  transform: function <C extends number, R extends number>(
    mat: Mat<C, R>,
    vec: Vec<C>,
  ): Vec<C> {
    let ret = [];
    for (let i = 0; i < (vec as number[]).length; i++) {
      ret.push(Vec.dot((mat as [number[]])[i] as Vec<C>, vec));
    }
    return ret as Vec<C>;
  },

  transpose: function <C extends number, R extends number>(
    mat: Mat<C, R>,
  ): Mat<R, C> {
    const m = mat as [number[]];
    let ret = [];

    for (let row = 0; row < m.length; row++) {
      let retrow = [];
      for (let col = 0; col < m[0].length; col++) {
        retrow.push(m[col][row]);
      }
      ret.push(retrow);
    }

    return ret as Mat<R, C>;
  },

  mult: function <C extends number, R extends number, C2 extends number>(
    a: Mat<C, R>,
    b: Mat<C2, C>,
  ): Mat<C2, R> {
    const A = a as [number[]];
    const B = b as [number[]];

    let ret = [];

    for (let i = 0; i < B.length; i++) {
      let row = [];
      for (let j = 0; j < A[0].length; j++) {
        let val = 0;
        for (let k = 0; k < B.length; k++) {
          val += A[k][i] * B[j][k];
        }
        row.push(val);
      }
      ret.push(row);
    }

    return ret as Mat<C2, R>;
  },
};

function rotMat(rot: Vec<3>): Mat<3, 3> {
  const R = rot as number[];

  const cx = Math.cos(R[0]);
  const sx = Math.sin(R[0]);
  const matx: Mat<3, 3> = [
    [1, 0, 0],
    [0, cx, -sx],
    [0, sx, cx],
  ];

  const cy = Math.cos(R[1]);
  const sy = Math.sin(R[1]);
  const maty: Mat<3, 3> = [
    [-sy, 0, cy],
    [0, 1, 0],
    [cy, 0, sy],
  ];

  const cz = Math.cos(R[2]);
  const sz = Math.sin(R[2]);
  const matz: Mat<3, 3> = [
    [cz, sz, 0],
    [-sz, cz, 0],
    [0, 0, 1],
  ];

  return Mat.mult<3, 3, 3>(Mat.mult<3, 3, 3>(matx, maty), matz) as Mat<3, 3>;
}

export class Transform3D {
  // TODO: support non-uniform scaling
  // scale: Vec<3>;
  scale: number;
  rotation: Vec<3>;
  position: Vec<3>;

  constructor({
    rotation,
    scale,
    position,
  }: {
    scale?: number;
    rotation?: Vec<3>;
    position?: Vec<3>;
  }) {
    this.rotation = rotation || [0, 0, 0];
    this.scale = scale || 1;
    this.position = position || [0, 0, 0];
  }

  getMat(): Mat<4, 4> {
    let scale = Mat.fromValue(this.scale, 3);
    let rot = rotMat(this.rotation);
    let m = Mat.mult<3, 3, 3>(scale, rot);

    return [
      [...m[0], 0],
      [...m[1], 0],
      [...m[2], 0],
      [...this.position, 1],
    ] as Mat<4, 4>;
  }

  getNormalMat(): Mat<3, 3> {
    return rotMat(this.rotation);
  }
}

const values: { [idx: string]: number } = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  a: 10,
  b: 11,
  c: 12,
  d: 13,
  e: 14,
  f: 15,
  A: 10,
  B: 11,
  C: 12,
  D: 13,
  E: 14,
  F: 15,
};

export function colorHexToVec3f(hex: string): [number, number, number] {
  if (hex.length != 7 || hex[0] !== "#")
    throw new Error(
      "color must have format: #dddddd with d a hexadecimal digit",
    );

  let res: number[] = [];
  for (let i = 0; i < 3; i++) {
    const color = (values[hex[i * 2 + 1]] * 16 + values[hex[i * 2 + 2]]) / 256;
    res.push(color);
  }

  return res as [number, number, number];
}
