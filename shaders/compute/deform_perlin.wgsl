struct Uniform {
    nVertices: u32,
    nLayers: u32,
    magnitude: f32,
    compression: f32,
}

@group(0) @binding(0) var<uniform> ubo: Uniform;
@group(0) @binding(1) var<storage, read> inbuff: array<f32>;
@group(0) @binding(2) var<storage, read_write> outbuff: array<f32>;

fn urand(n: u32) -> u32 {
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

const grad_vector = array(
    vec3f(1, 1, 0),
    vec3f(-1, 1, 0),
    vec3f(1, -1, 0),
    vec3f(-1, -1, 0),
    vec3f(1, 0, 1),
    vec3f(-1, 0, 1),
    vec3f(1, 0, -1),
    vec3f(-1, 0, -1),
    vec3f(0, 1, 1),
    vec3f(0, -1, 1),
    vec3f(0, 1, -1),
    vec3f(0, -1, -1),
    vec3f(1, 1, 0),
    vec3f(1, -1, 0),
    vec3f(-1, 1, 0),
    vec3f(-1, 0, -1),
);

fn grad(v: u32, x: f32, y: f32, z: f32) -> f32 {
    let vec = grad_vector[v & 0xf] * vec3f(x, y, z);

    return vec.x + vec.y + vec.z;
}

fn perlin(p: vec3f) -> f32 {
    let frac = p - floor(p);
    let cords = vec3u(floor(p));

    let aaa = urand(urand(urand(cords.x) + cords.y) + cords.z);
    let aba = urand(urand(urand(cords.x) + cords.y + 1) + cords.z);
    let aab = urand(urand(urand(cords.x) + cords.y) + cords.z + 1);
    let abb = urand(urand(urand(cords.x) + cords.y + 1) + cords.z + 1);
    let baa = urand(urand(urand(cords.x + 1) + cords.y) + cords.z);
    let bba = urand(urand(urand(cords.x + 1) + cords.y + 1) + cords.z);
    let bab = urand(urand(urand(cords.x + 1) + cords.y) + cords.z + 1);
    let bbb = urand(urand(urand(cords.x + 1) + cords.y + 1) + cords.z + 1);

    let u = fade(frac.x);
    let v = fade(frac.y);
    let w = fade(frac.z);

    let x1 = mix(
        grad(aaa, frac.x, frac.y, frac.z),
        grad(baa, frac.x - 1., frac.y, frac.z),
        u
    );
    let x2 = mix(
        grad(aba, frac.x, frac.y - 1., frac.z),
        grad(bba, frac.x - 1., frac.y - 1., frac.z),
        u
    );
    let x3 = mix(
        grad(aab, frac.x, frac.y, frac.z - 1.),
        grad(bab, frac.x - 1., frac.y, frac.z - 1.),
        u
    );
    let x4 = mix(
        grad(abb, frac.x, frac.y - 1., frac.z - 1.),
        grad(bbb, frac.x - 1., frac.y - 1., frac.z - 1.),
        u
    );
    let y1 = mix(x1, x2, v);
    let y2 = mix(x3, x4, v);
    let val = mix(y1, y2, w);

    return (val + 1) / 2;
}

fn fbm(p: vec3f) -> f32 {
    var val = 0.0;
    var sum = 0.0;

    for (var i = 0u; i < ubo.nLayers; i++) {
        let factor = f32(1u << i);
        let weight = 1.0 / factor;

        val += perlin(p * factor) * weight;
        // TODO: fix normals
        // let sample = perlin(p * factor);
        // let noise = 1 - pow(abs(sample * 2 - 1), 1/1.5);
        // val += noise * weight;
        sum += weight;
    }

    return val / sum * ubo.magnitude;
}

@compute @workgroup_size(64, 1, 1)
fn main(@builtin(global_invocation_id) inID: vec3u) {
    let id = inID.x;
    let inpos = vec3f(
        inbuff[id * 6],
        inbuff[id * 6 + 1],
        inbuff[id * 6 + 2]
    );
    let innormal = vec3f(
        inbuff[id * 6 + 3],
        inbuff[id * 6 + 4],
        inbuff[id * 6 + 5]
    );
    let samplePos = (inpos + vec3f(1)) * ubo.compression;

    let pos = inpos + inpos * fbm(samplePos);

    let eps = 0.0001;
    let grad = vec3f(
        (fbm(samplePos + vec3f(eps, 0, 0)) - fbm(samplePos + vec3f(-eps, 0, 0))) / (eps * 2),
        (fbm(samplePos + vec3f(0, eps, 0)) - fbm(samplePos + vec3f(0, -eps, 0))) / (eps * 2),
        (fbm(samplePos + vec3f(0, 0, eps)) - fbm(samplePos + vec3f(0, 0, -eps))) / (eps * 2),
    );
    let normal = normalize(innormal - grad);

    outbuff[id * 6] = pos.x;
    outbuff[id * 6 + 1] = pos.y;
    outbuff[id * 6 + 2] = pos.z;
    outbuff[id * 6 + 3] = normal.x;
    outbuff[id * 6 + 4] = normal.y;
    outbuff[id * 6 + 5] = normal.z;
}
