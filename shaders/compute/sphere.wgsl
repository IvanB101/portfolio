struct Uniform {
    n: u32,
}

@group(0) @binding(0) var<uniform> ubo: Uniform;

const I = mat3x3(
    1, 0, 0,
    0, 1, 0,
    0, 0, 1,
);
const rot90y = mat3x3f(
    0, 0, -1,
    0, 1, 0,
    1, 0, 0
);
const rotm90y = mat3x3f(
    0, 0, 1,
    0, 1, 0,
    -1, 0, 0
);
const rot90x = mat3x3f(
    1, 0, 0,
    0, 0, 1,
    0, -1, 0
);
const rotm90x = mat3x3f(
    1, 0, 0,
    0, 0, -1,
    0, 1, 0
);
const rotations = array(
    I, rot90x, rotm90x, rot90y, rot90y * rot90y, rotm90y
);

@group(0) @binding(1) var<storage, read_write> vbuff: array<f32>;

@compute @workgroup_size(64, 1, 1)
fn vertices(@builtin(global_invocation_id) inID: vec3u) {
    let id = inID.x;
    let rows = ubo.n + 1;
    let faceSize = rows * rows;
    if id >= 6 * faceSize {
        return;
    }
    var face = id / faceSize;
    let rem = id % faceSize;

    let x = f32(rem % rows) / f32(ubo.n) * 2 - 1;
    let y = f32(rem / rows) / f32(ubo.n) * 2 - 1;
    let v = normalize(rotations[face] * vec3f(x, -y, -1));

    vbuff[id * 6] = v.x;
    vbuff[id * 6 + 1] = v.y;
    vbuff[id * 6 + 2] = v.z;
    // derivatives instead of normal
    vbuff[id * 6 + 3] = 2 * v.x;
    vbuff[id * 6 + 4] = 2 * v.y;
    vbuff[id * 6 + 5] = 2 * v.z;
}

@group(0) @binding(1) var<storage, read_write> ibuff: array<u32>;

@compute @workgroup_size(64, 1, 1)
fn indices(@builtin(global_invocation_id) inID: vec3u) {
    let id = inID.x;
    let faceSize = ubo.n * ubo.n;
    if id >= 6 * faceSize {
        return;
    }
    let face = id / faceSize;
    let rem = id % faceSize;
    let x = rem % ubo.n;
    let y = rem / ubo.n;

    let orig = face * (ubo.n + 1) * (ubo.n + 1);

    let tl = orig + x + y * (ubo.n + 1);
    let tr = orig + x + 1 + y * (ubo.n + 1);
    let bl = orig + x + (y + 1) * (ubo.n + 1);
    let br = orig + x + 1 + (y + 1) * (ubo.n + 1);

    ibuff[id * 6] = tr;
    ibuff[id * 6 + 1] = bl;
    ibuff[id * 6 + 2] = br;
    ibuff[id * 6 + 3] = tr;
    ibuff[id * 6 + 4] = tl;
    ibuff[id * 6 + 5] = bl;
}
