struct VertOut {
    @builtin(position) pos: vec4f,
    @location(0) dir: vec3f,
};

struct Display {
    max_width: u32,
    max_height: u32,
    width: u32,
    height: u32,
}

struct Viewer {
    pos: vec3f,
    forward: vec3f,
    up: vec3f,
}

struct Camera {
    fov: f32, 
    near: f32, 
    far: f32, 
};

struct Uniform {
    display: Display,
    viewer: Viewer,
    camera: Camera,
};

struct DirectionalLight {
    color: vec4f,
    dir: vec3f,
}

struct AmbientLight {
    color: vec4f,
}

@group(0) @binding(0) var<uniform> ubo: Uniform;

@vertex
fn vs(
    @builtin(vertex_index) idx: u32
) -> VertOut {
    let aspect = f32(ubo.display.width) / f32(ubo.display.height);
    let displayed = (f32(ubo.display.width) / f32(ubo.display.max_width));

    let forward = ubo.viewer.forward;
    let up = ubo.viewer.up;

    let n = -forward / length(forward);
    let cross_up_n = cross(up, n);
    let u = cross_up_n / length(cross_up_n);
    let v = cross(n, u);

    let mat_cam = mat4x4(
        vec4f(u, forward.x),
        vec4f(v, forward.y),
        vec4f(n, forward.z),
        vec4f(vec3f(0), 1),
    );

    let x = sin(ubo.camera.fov / 2) * displayed;
    let y = x / aspect;
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
    out.dir = (mat_cam * vec4f(dir[idx], 1)).xyz;
    out.pos = vec4f(pos[idx], 0, 1.0);

    return out;
}

fn sceneSDF(p: vec3f) -> f32 {
    return length(p) - 1;
}

fn aproxGrad(p: vec3f) -> vec3f {
    let delta = 0.01;

    return normalize(vec3f(
        sceneSDF(vec3f(p.x + delta, p.y, p.z)) - sceneSDF(vec3f(p.x - delta, p.y, p.z)),
        sceneSDF(vec3f(p.x, p.y + delta, p.z)) - sceneSDF(vec3f(p.x, p.y - delta, p.z)),
        sceneSDF(vec3f(p.x, p.y, p.z + delta)) - sceneSDF(vec3f(p.x, p.y, p.z - delta))
    ));
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

    let gradient = aproxGrad(ubo.viewer.pos + dir * depth);

    let dir_light = DirectionalLight(vec4f(1, 1, 1, 0.5), normalize(vec3f(0, -1, 0)));
    let amb_light = AmbientLight(vec4f(1, 1, 1, 0.05));

    let diffuse = (dir_light.color.xyz * dir_light.color.w * max(-dot(dir_light.dir, gradient), 0) + amb_light.color.xyz * amb_light.color.w).xyz;

    let color = vec4f(1, 0.1, 0.1, 1);

    return vec4f(color.xyz * diffuse, 1);
}
