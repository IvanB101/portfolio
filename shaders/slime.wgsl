const PI = 3.1415926535;
const sqrt2 = 1.4142135624;

struct Display {
    max: vec2u,
    current: vec2u,
}

struct Uniform {
    dims: vec2u,
    color: vec3f,
}

struct Agent {
    pos: vec2f,
    angle: f32,
}

struct Fragment {
    @builtin(position) ndcpos: vec4f,
    @location(0) uv: vec2f
}

@group(0) @binding(0) var<uniform> ubo: Uniform;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;

@vertex
fn vs(@builtin(vertex_index) idx: u32) -> Fragment {
    let ndcpos = array(
        vec4f(-1., 3., 0., 1.),
        vec4f(-1., -1., 0., 1.),
        vec4f(3., -1., 0., 1.)
    );

    let uv = array(
        vec2f(0., 2.),
        vec2f(0., 0.),
        vec2f(2., 0.)
    );

    return Fragment(ndcpos[idx], uv[idx]);
}

@fragment
fn fs(in: Fragment) -> @location(0) vec4f {
    return vec4f(mix(
        vec3f(0.),
        ubo.color,
        textureSample(tex, samp, in.uv).r
    ), 1.);
}

struct InitConfig {
    seed: u32,
    nAgents: u32,
    size: vec2u,
}

fn urandom(n: u32) -> u32 {
    var x: u32 = n;
    x ^= x >> 16u;
    x *= 0xa812d533u;
    x ^= x >> 15u;
    x *= u32(0xb278e4ad);
    x ^= x >> 17u;
    return x;
}

fn random(n: u32) -> f32 {
    var val = urandom(n) >> 9u;
    let exp = 127u << 23u;

    return bitcast<f32>(val | exp) - 1.;
}

@group(0) @binding(0) var<uniform> iconfig: InitConfig;
@group(0) @binding(1) var<storage, read_write> iagents: array<Agent>;
@group(0) @binding(2) var<storage, read_write> medium: array<f32>;

@compute @workgroup_size(64, 1, 1)
fn initAgents(@builtin(global_invocation_id) iid: vec3u) {
    if iid.x > iconfig.nAgents {
        return;
    }

    let sample = iid.x * iconfig.seed;
    let angle = random(sample) * 2. * PI;
    let a = random(sample * iconfig.seed) * 2. * PI;
    let d = random(urandom(sample * iconfig.seed)) * 0.5 * f32(min(iconfig.size.x, iconfig.size.y));
    let pos = vec2f(iconfig.size) * 0.5 + vec2f(cos(a), sin(a)) * d;

    iagents[iid.x] = Agent(pos, angle);
    medium[u32(pos.x) + u32(pos.y) * iconfig.size.x] = 1.;
}

struct Config {
    time: u32,
    decay: f32,
    turnRate: f32,
    nAgents: u32,
    sensoryAngle: f32,
    sensoryOffset: f32,
    size: vec2u,
    padding: u32, // in number of u32
}

fn idx(cords: vec2u) -> u32 {
    return cords.x + cords.y * config.size.x;
}

fn wrap(cords: vec2f) -> vec2f {
    let dims = vec2f(config.size);
    return vec2f(
        cords.x - select(0., dims.x, cords.x > dims.x) + select(0., dims.x, cords.x < 0.),
        cords.y - select(0., dims.y, cords.y > dims.y) + select(0., dims.y, cords.y < 0.)
    );
}

@group(0) @binding(0) var<uniform> config: Config;
@group(0) @binding(1) var<storage, read_write> medium1: array<f32>;
@group(0) @binding(2) var<storage, read_write> medium2: array<f32>;
@group(0) @binding(3) var<storage, read_write> agents: array<Agent>;

@compute @workgroup_size(64, 1, 1)
fn updateAgents(@builtin(global_invocation_id) iid: vec3u) {
    if iid.x >= config.nAgents {
        return;
    }

    var angle = agents[iid.x].angle;
    var pos = agents[iid.x].pos;

    let angleLeft = angle + config.sensoryAngle;
    let leftCords = vec2i(wrap(pos + vec2f(cos(angleLeft), sin(angleLeft)) * config.sensoryOffset));
    let left = medium2[idx(vec2u(leftCords))];
    let frontCords = vec2i(wrap(pos + vec2f(cos(angle), sin(angle)) * config.sensoryOffset));
    var front = medium2[idx(vec2u(frontCords))];
    let angleRight = angle - config.sensoryAngle;
    let rightCords = vec2i(wrap(pos + vec2f(cos(angleRight), sin(angleRight)) * config.sensoryOffset));
    var right = medium2[idx(vec2u(rightCords))];

    var delta = 0.;
    if front >= max(left, right) {
    } else if front < min(left, right) {
        delta = select(1., -1., (bitcast<u32>(left) & 1u) == 0) * config.turnRate;
    } else if left > right {
        delta = config.turnRate;
    } else if right > left {
        delta = -config.turnRate;
    }
    angle = angle + delta;
    if angle < 0. {
        angle = 2. * PI + angle;
    }
    if angle > 2. * PI {
        angle -= 2. * PI;
    }

    pos = wrap(pos + vec2f(cos(angle), sin(angle)));

    agents[iid.x] = Agent(pos, angle);
    medium1[idx(vec2u(round(agents[iid.x].pos)))] = 1.;
}

@compute @workgroup_size(64, 1, 1)
fn updateMedium(@builtin(global_invocation_id) iid: vec3u) {
    if iid.x >= config.size.x * config.size.y {
        return;
    }
    let cords = vec2f(
        f32(i32(iid.x % config.size.x)),
        f32(i32(iid.x / config.size.x))
    );

    var val = 0.;
    for (var i = -1; i < 2; i++) {
        for (var j = -1; j < 2; j++) {
            let sampleCords = vec2u(wrap(cords + vec2f(f32(i), f32(j))));
            val += medium1[idx(sampleCords)];
        }
    }

    medium2[idx(vec2u(cords))] = val * (1. / 9.) * config.decay;
}

@group(0) @binding(1) var<storage, read_write> data: array<f32>;
@group(0) @binding(2) var<storage, read_write> converted: array<u32>;

@compute @workgroup_size(64, 1, 1)
fn convert(@builtin(global_invocation_id) iid: vec3u) {
    let idx = iid.x << 2u;
    if idx >= config.size.x * config.size.y {
        return;
    }

    var val = 0u;
    val |= u32(round(data[idx] * 255.));
    val |= u32(round(data[idx + 1u] * 255.)) << 8u;
    val |= u32(round(data[idx + 2u] * 255.)) << 16u;
    val |= u32(round(data[idx + 3u] * 255.)) << 24u;

    converted[iid.x + ((config.padding * (idx / config.size.x)) >> 2u)] = val;
}
