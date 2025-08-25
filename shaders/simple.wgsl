struct VertOut {
    @builtin(position) pos: vec4f,
    @location(0) dir: vec3f,
};

struct Viewer {
    pos: vec3f,
    forward: vec3f,
    up: vec3f,
}

struct Camera {
    fov: f32, 
    near: f32, 
    far: f32, 
    aspect: f32, 
};

struct Uniform {
    viewer: Viewer,
    camera: Camera,
};

@group(0) @binding(0) var<uniform> ubo: Uniform;

const start = -1;
const end = 3;
const dim = end - start;

@vertex
fn vs(
    @builtin(vertex_index) idx: u32
) -> VertOut {
    let x = sin(ubo.camera.fov / 2);
    let y = x / ubo.camera.aspect;
    let z = cos(ubo.camera.fov / 2);

    let dir = array(
        vec3f(-x, 3 * y, -z),
        vec3f(-x, -y, -z),
        vec3f(3 * x, -y, -z)
    );
    let pos = array(
        vec2f(-1, 3),
        vec2f(-1, -1),
        vec2f(3, -1)
    );

    var out: VertOut;
    out.dir = dir[idx];
    out.pos = vec4f(pos[idx], 0, 1.0);

    return out;
}

fn sceneSDF(p: vec3f) -> f32 {
    return length(p) - 1;
}

const MAX_MARCHING_STEPS: u32 = 30;
const EPSILON: f32 = 0.01;

@fragment 
fn fs(in: VertOut) -> @location(0) vec4f {
    let dir = normalize(in.dir);
    // TODO: control not starting inside a volume
    var depth = ubo.camera.near;
    for (var i: u32 = 0; i < MAX_MARCHING_STEPS; i++) {
        let dist = sceneSDF(ubo.viewer.pos + dir * depth);
        if dist < EPSILON {
            break;
        }
        depth += dist;
        if depth >= ubo.camera.far {
            break;
        }
    }
    if depth >= ubo.camera.far {
        return vec4f(0.0, 0.0, 0.0, 1.0);
    }

    // return vec4f(length(dir), 0.0, 0.0, 1.0);
    return vec4f(1.0, 0.0, 0.0, 1.0);
}
