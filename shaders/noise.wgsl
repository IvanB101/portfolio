const PI = 3.1415926536;

struct Display {
    max_width: u32,
    max_height: u32,
    width: u32,
    height: u32,
}

struct Uniform {
    time: u32,
    @align(16) display: Display,
};

@group(0) @binding(0) var<uniform> ubo: Uniform;

struct VertOut {
    @builtin(position) pos: vec4f,
    @location(0) uv: vec2f,
};

@vertex
fn vs(
    @builtin(vertex_index) idx: u32
) -> VertOut {
    let pos = array(
        vec2f(-1, 3),
        vec2f(-1, -1),
        vec2f(3, -1)
    );

    let hidden = vec2f(1) - vec2f(f32(ubo.display.width) / f32(ubo.display.max_width), f32(ubo.display.height) / f32(ubo.display.max_height));
    let uv = array(
        vec2f(hidden.x / 2, 2 - hidden.y),
        vec2f(hidden.x / 2, hidden.y / 2),
        vec2f(2 - hidden.x, hidden.y / 2),
    );

    var out: VertOut;
    out.pos = vec4f(pos[idx], 0, 1.0);
    out.uv = uv[idx];

    return out;
}

const width = 0.1;
const height= 0.1;

fn random(n: u32) -> f32 {
    let a = (29340983 >> (n & 31)) ^ (49235439 << (n & 31));
    let c = (92384 << (n & 31)) ^ (12391834 >> (n & 31));
    let m = (1 << 15) -1;

    return f32((a * (i32(n) + c)) & m) / f32(m);
}

fn offset(cords: vec2u) -> vec2<f32> {
    let o = vec2f(random(cords.x ^ (cords.y << (cords.x & 3))), random(cords.y | (cords.x << (cords.y & 15))));
    // TODO: animate
    return o;
}

fn cellular(uv: vec2f) -> f32 {
    var dist = 4.0;
    let cord = vec2u(u32(floor(uv.x / width)), u32(floor(uv.y / height)));
    let cur = vec2f(uv.x - f32(cord.x) * width, uv.y - f32(cord.y) * width) / width;

    for (var x: u32 = 0; x <= 2; x++) {
        for (var y: u32 = 0; y <= 2; y++) {
            let o = offset(cord + vec2u(x, y));
            let d = vec2f(f32(x), f32(y)) - vec2f(1) + o - cur;
            dist = min(dot(d, d), dist);
        }
    }

    return sqrt(dist / 2);
}

fn cellularManhatam(uv: vec2f) -> f32 {
    var dist = 2.0;
    let cord = vec2u(u32(floor(uv.x / width)), u32(floor(uv.y / height)));
    let cur = vec2f(uv.x - f32(cord.x) * width, uv.y - f32(cord.y) * width) / width;

    for (var x: u32 = 0; x <= 2; x++) {
        for (var y: u32 = 0; y <= 2; y++) {
            let o = offset(cord + vec2u(x, y));
            let d = vec2f(f32(x), f32(y)) - vec2f(1) + o - cur;
            dist = min(abs(d.x) + abs(d.y), dist);
        }
    }

    return sqrt(dist / 2);
}

fn cellWalls(uv: vec2f) -> f32 {
    var dist1 = 4.0;
    var dist2 = 4.0;
    let cord = vec2u(u32(floor(uv.x / width)), u32(floor(uv.y / height)));
    let cur = vec2f(uv.x - f32(cord.x) * width, uv.y - f32(cord.y) * width) / width;

    for (var x: u32 = 0; x <= 2; x++) {
        for (var y: u32 = 0; y <= 2; y++) {
            let o = offset(cord + vec2u(x, y));
            let d = vec2f(f32(x), f32(y)) - vec2f(1) + o - cur;
            let dd = length(d);
            dist2 = min(dist2, max(dd, dist1));
            dist1 = min(dist1, dd);
        }
    }

    // return 1 - (dist2 - dist1);
    let threshold = 1.0;
    return max(threshold - (dist2 - dist1), 0) / threshold * 0.7;
}

fn constantVector(v: u32) -> vec2f {
    let vector = array(
        vec2f(1, 1),
        vec2f(-1, 1),
        vec2f(-1, -1),
        vec2f(1, -1),
    );

    return vector[v & 3];
}

fn urandom(n: u32) -> u32 {
    var x = n;
    x ^= x >> 16;
    x *= 0xa812d533;
    x ^= x >> 15;
    x *= 0xb278e4ad;
    x ^= x >> 17;
    return x;
}

fn fade(t: f32) -> f32 {
    return ((6 * t - 15) * t + 10) * t * t * t;
}

fn perlin(p: vec2f) -> f32 {
    let frac = p - floor(p);
    let cords = vec2u(floor(p));

    let tr = frac + vec2f(-1);
    let tl = frac + vec2f(0, -1);
    let br = frac + vec2f(-1, 0);
    let bl = frac;

    let vtr = urandom(urandom(cords.x + 1) + cords.y + 1);
    let vtl = urandom(urandom(cords.x) + cords.y + 1);
    let vbr = urandom(urandom(cords.x + 1) + cords.y);
    let vbl = urandom(urandom(cords.x) + cords.y);

    let dtr = dot(tr, constantVector(vtr));
    let dtl = dot(tl, constantVector(vtl));
    let dbr = dot(br, constantVector(vbr));
    let dbl = dot(bl, constantVector(vbl));

    let u = fade(frac.x);
    let v = fade(frac.y);

    let val = mix(mix(dbl, dtl, v), mix(dbr, dtr, v), u);
    return (val + 1) / 2;
}

fn valueGradient(p: vec2f) -> f32 {
    let width = 1000u;
    let frac = p - floor(p);
    let cords = vec2u(floor(p));

    let tr = random((cords.x + 1) * width + cords.y + 1);
    let tl = random(cords.x * width + cords.y + 1);
    let br = random((cords.x + 1) * width + cords.y);
    let bl = random(cords.x * width + cords.y);

    let u = fade(frac.x);
    let v = fade(frac.y);

    let val = mix(mix(bl, tl, v), mix(br, tr, v), u);
    return val;
}

fn fbm(p: vec2f) -> f32 {
    var val = 0.0;
    var sum = 0.0;

    let n_layers = 4u;
    for (var i = 0u; i < n_layers; i++) {
        let factor = f32(1u << i);
        let weight = 1.0 / factor;

        // val += perlin(p * factor) * weight;
        val += perlin(p * factor) * weight;
        sum += weight;
    }

    return val / sum;
}

fn turbulence1(p: vec2f) -> f32 {
    let q = vec2f(
        fbm(p + vec2f(0)),
        fbm(p + vec2f(5.2, 1.3))
    );

    return fbm(p + 4 * q);
}   

fn turbulence2(p: vec2f) -> f32 {
    let q = vec2f(
        fbm(p + vec2f(0)),
        fbm(p + vec2f(5.2, 1.3))
    );
    let r = vec2f(
        fbm(p + 4.0 * q + vec2f(1.7, 9.2)),
        fbm(p + 4.0 * q + vec2f(8.3, 2.8))
    );

    return fbm(p + 4 * r);
}

fn turbulence3(p: vec2f) -> f32 {
    let q = vec2f(
        fbm(p + vec2f(0)),
        fbm(p + vec2f(5.2, 1.3))
    );
    let r = vec2f(
        fbm(p + 4.0 * q + vec2f(1.7, 9.2)),
        fbm(p + 4.0 * q + vec2f(8.3, 2.8))
    );
    let s = vec2f(
        fbm(p + 4.0 * r + vec2f(2.1, 10.4)),
        fbm(p + 4.0 * r + vec2f(9.7, 0.2))
    );

    return fbm(p + 4 * s);
}

@fragment 
fn fs(in: VertOut) -> @location(0) vec4f {
    // let uv = in.uv + f32(ubo.time) / 2000;
    let uv = in.uv;
    // let val = abs(sqrt(sqrt(dist / 2)) - 1);
    // return vec4f(vec3f(cellular(uv)), 1);
    // return vec4f(vec3f(1 - cellularManhatam(uv)), 1);
    // return vec4f(vec3f(perlin(uv * 5 + vec2f(1))), 1);
    // return vec4f(vec3f(fbm(uv * 10 + vec2f(1))), 1);
    return vec4f(vec3f(turbulence3(uv * 20 + vec2f(1))), 1);
    // return vec4f(vec3f(cellWalls(uv)), 1);
}
