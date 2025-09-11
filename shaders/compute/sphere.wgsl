struct Uniform {
    n: u32,
}

struct Vertex {
    pos: vec3f,
    normal: vec3f,
}

@group(0) @binding(0) var<uniform> ubo: Uniform;
@group(0) @binding(1) var<storage, readwrite> vbuff: array<Vertex>;
@group(0) @binding(2) var<storage, readwrite> ibuff: array<u32>;

const isqrt2 = 1 / 1.4142135624;
const isqrt3 = 1 / 1.7320508076;
const origin = array(
    vec3f(-isqrt3, isqrt3, -isqrt3),
    vec3f(-isqrt3, -isqrt3, -isqrt3),
    vec3f(-isqrt3, isqrt3, isqrt3),
    vec3f(isqrt3, isqrt3, -isqrt3),
    vec3f(isqrt3, isqrt3, isqrt3),
    vec3f(-isqrt3, isqrt3, isqrt3),
);
const disp = array(
    vec3f(1, -1, 0),
    vec3f(1, 0, 1),
    vec3f(1, 0, -1),
    vec3f(0, -1, 1),
    vec3f(-1, -1, 0),
    vec3f(0, -1, -1),
);
const dir = array(
    vec3f(1, 0, 0),
    vec3f(0, 1, 0),
    vec3f(1, 0, 0),
    vec3f(0, 0, 1),
    vec3f(1, 0, 0),
    vec3f(0, 0, 1),
    vec3f(0, 0, 1),
    vec3f(0, 1, 0),
    vec3f(1, 0, 0),
    vec3f(0, 1, 0),
    vec3f(0, 0, 1),
    vec3f(0, 1, 0),
);

@compute @workgroup_size(64, 1, 1)
fn verteces(@builtin(global_invocation_id) inID: vec3u) {
    let id = inID.x;
    let dims = array(
        vec2u(n + 1, n + 1),
        vec2u(n + 1, n),
        vec2u(n + 1, n - 1),
        vec2u(n, n - 1),
        vec2u(n, n - 1),
        vec2u(n - 1, n - 1),
    );
    var face = 0u;
    var size = dims[0].x * dims[0].y;
    var rem = id;
    var i = 0;
    loop {
        break if rem < size;
        face++;
        rem -= size;
        size = dims[face].x * dims[face].y;
    }
    let rows = dims[face].x;

    let o = origin[face];
    let d = disp[face];
    let x = disp[face] * dir[face * 2] * f32(rem % rows);
    let y = disp[face] * dir[face * 2 + 1] * f32(rem / rows);
    let v = normalize(vec2f(x, y));

    vbuff[id] = Vertex(v, v);
}

@compute @workgroup_size(64, 1, 1)
fn indices(@builtin(global_invocation_id) inID: vec3u) {
    let id = inID.x;
    let face = id / (n * n);
    let rem = id % (n * n);
    let cords = vec2u(
        rem % n,
        rem / n
    );

    let tl = cords.x + cords.y * (n + 1);
    let tr = cords.x + 1 + cords.y * (n + 1);
    let bl = cords.x + (cords.y + 1) * (n + 1);
    let br = cords.x + (cords.y + 1) * (n + 1);

    ibuff[id * 6] = tr;
    ibuff[id * 6 + 1] = bl;
    ibuff[id * 6 + 2] = br;
    ibuff[id * 6 + 3] = tr;
    ibuff[id * 6 + 4] = br;
    ibuff[id * 6 + 5] = tl;
}
