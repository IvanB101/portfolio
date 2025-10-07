const PI = 3.1415926535;
const sqrt2 = 1.4142135624;

struct Display {
    max: vec2u,
    current: vec2u,
}

struct Uniform {
    display: Display,
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
@group(0) @binding(1) var<storage, read_write> medium1: array<f32>;

@vertex
fn vs(@builtin(vertex_index) idx: u32) -> Fragment {
    let ndcpos = array(
        vec4f(-1., 3., 0., 1.),
        vec4f(-1., -1., 0., 1.),
        vec4f(3., -1., 0., 1.)
    );

    let uv = array(
        vec2f(0., 2. * f32(ubo.display.current.y)),
        vec2f(0., 0.),
        vec2f(2. * f32(ubo.display.current.x), 0.)
    );

    return Fragment(ndcpos[idx], uv[idx]);
}

@fragment
fn fs(in: Fragment) -> @location(0) vec4f {
    return vec4f(vec3f(medium1[u32(in.uv.x) + u32(in.uv.y) * ubo.display.current.x]), 1.);
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
}

struct Config {
    time: u32,
    decay: f32,
    turnRate: f32,
    nAgents: u32,
    sensoryAngle: f32,
    sensoryOffset: f32,
    size: vec2u,
}

@group(0) @binding(0) var<uniform> config: Config;

fn idx(cords: vec2u) -> u32 {
    return cords.x + cords.y * config.size.x;
}

fn rot(angle: f32) -> mat2x2<f32> {
    let s = sin(angle);
    let c = cos(angle);

    return mat2x2(
        c, -s,
        s, c
    );
}

@group(0) @binding(2) var<storage, read_write> agents: array<Agent>;

@compute @workgroup_size(64, 1, 1)
fn updateAgents(@builtin(global_invocation_id) iid: vec3u) {
    if iid.x >= config.nAgents {
        return;
    }

    var angle = agents[iid.x].angle;
    var pos = agents[iid.x].pos;

    let cords = vec2i(pos);
    // _ = medium1[0];
    let leftCords = vec2i(pos + vec2f(cos(angle + config.sensoryAngle), sin(angle + config.sensoryAngle)) * config.sensoryOffset);
    var left = select(medium1[idx(vec2u(leftCords))], -1., u32(leftCords.x) > config.size.x || u32(leftCords.y) > config.size.y);
    let frontCords = vec2i(pos + vec2f(cos(angle), sin(angle)) * config.sensoryOffset);
    var front = select(medium1[idx(vec2u(frontCords))], -1., u32(frontCords.x) > config.size.x || u32(frontCords.y) > config.size.y);
    let rightCords = vec2i(pos + vec2f(cos(angle - config.sensoryAngle), sin(angle - config.sensoryAngle)) * config.sensoryOffset);
    var right = select(medium1[idx(vec2u(rightCords))], -1., u32(rightCords.x) > config.size.x || u32(rightCords.y) > config.size.y);

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

    let newPos = pos + vec2f(cos(angle), sin(angle));
    if newPos.x <= 0. || u32(ceil(newPos.x)) >= config.size.x || newPos.y <= 0. || u32(ceil(newPos.y)) >= config.size.y {
        angle = random(iid.x + config.time) * 2. * PI;
    }
    // if newPos.x <= 0. || u32(ceil(newPos.x)) >= config.size.x {
    //     angle = PI - angle;
    // }
    // if newPos.y <= 0. || u32(ceil(newPos.y)) >= config.size.y {
    //     angle = -angle;
    // }
    pos = clamp(newPos, vec2f(0.), vec2f(config.size));

    agents[iid.x] = Agent(pos, angle);
}

@compute @workgroup_size(64, 1, 1)
fn deposit(@builtin(global_invocation_id) iid: vec3u) {
    if iid.x >= config.nAgents {
        return;
    }

    medium1[idx(vec2u(round(agents[iid.x].pos)))] = 1.;
}

@group(0) @binding(2) var<storage, read_write> medium2: array<f32>;

@compute @workgroup_size(64, 1, 1)
fn updateMedium(@builtin(global_invocation_id) iid: vec3u) {
    if iid.x >= config.size.x * config.size.y {
        return;
    }
    let cords = vec2i(
        i32(iid.x % config.size.x),
        i32(iid.x / config.size.x)
    );

    var val = 0.;
    for (var i = -1; i < 2; i++) {
        for (var j = -1; j < 2; j++) {
            let sampleCords = vec2u(cords + vec2i(i, j));

            if !(sampleCords.x >= config.size.x || sampleCords.y >= config.size.y) {
                val += medium1[idx(sampleCords)];
            }
        }
    }

    medium2[iid.x] = val * (1. / 9.) * config.decay;
}
