const PI = 3.1415926536;
const EPSILON: f32 = 0.01;

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

struct Material {
    color: vec4f,
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
    time: u32,
    @align(16) display: Display,
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

    let pos = ubo.viewer.pos;
    let forward = ubo.viewer.forward;
    let up = ubo.viewer.up;

    let n = -normalize(forward);
    let cross_up_n = cross(up, n);
    let u = cross_up_n / length(cross_up_n);
    let v = cross(n, u);

    let mat_cam = mat4x4(
        vec4f(u, pos.x),
        vec4f(v, pos.y),
        vec4f(n, pos.z),
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
    let uv = array(
        vec2f(-1, 3),
        vec2f(-1, -1),
        vec2f(3, -1)
    );

    var out: VertOut;
    out.dir = (mat_cam * vec4f(dir[idx], 1)).xyz;
    out.pos = vec4f(uv[idx], 0, 1.0);

    return out;
}

fn smax(a: f32, b: f32, k: f32) -> f32 {
    let h = max(k - abs(a - b), 0);
    return max(a, b) + (0.25 / k) * h * h;
}

fn sphereSDF(p: vec3f, r: f32) -> f32 {
    return length(p) - r;
}

fn boxSDF(p: vec3f, r: vec3f) -> f32 {
    return length(max(abs(p) - r, vec3f(0)));
}

fn map(p: vec3f) -> vec3f {
    let alpha = f32(ubo.time) / 1000 / 10 * 2 * PI;
    let temp = mat2x2(cos(alpha), -sin(alpha), sin(alpha), cos(alpha)) * p.xz;
    return vec3f(temp.x, p.y, temp.y);
}

fn sceneSDF(in_p: vec3f) -> vec2f {
    let p = map(in_p);
    var dist = vec2f(0);

        {
        let alpha = p.y * PI;
        let temp = mat2x2(cos(alpha), -sin(alpha), sin(alpha), cos(alpha)) * p.xz;
        let tp = vec3f(temp.x, p.y, temp.y);
        // let tp = p + vec3f(p.y, 0, 0);
        // let disp = vec3f(sin(20 * p.x), sin(20 * p.y), sin(20 * p.z));
        // let tp = p + vec3f(1, 1, 0);
        dist = vec2f(boxSDF(tp, vec3f(0.5, 1.5, 0.5)) - 0.00, 0);
    }

    let plane = p.y + 1;
    dist = select(vec2f(plane, 1), dist, plane > dist.x);

    return dist;
}

fn calcNormal(p: vec3f) -> vec3f {
    let eps = 0.0001;

    let k1 = vec3(1.0, -1.0, -1.0);
    let k2 = vec3(-1.0, -1.0, 1.0);
    let k3 = vec3(-1.0, 1.0, -1.0);
    let k4 = vec3(1.0, 1.0, 1.0);

    return normalize(
        k1 * sceneSDF(p + eps * k1).x + k2 * sceneSDF(p + eps * k2).x + k3 * sceneSDF(p + eps * k3).x + k4 * sceneSDF(p + eps * k4).x
    );
}

const MAX_MARCHING_STEPS: u32 = 100;

const MATERIALS = array<Material, 2>(
    Material(vec4f(1, 0, 0, 1)),
    Material(vec4f(0, 1, 0, 1)),
);

fn intersec(pos: vec3f, dir: vec3f, initial_depth: f32) -> f32 {
    let depth_factor = 0.5;
    var depth = initial_depth;
    for (var i: u32 = 0; i < MAX_MARCHING_STEPS; i++) {
        let dist = sceneSDF(pos + dir * depth).x;
        if dist < 0 {
            depth += dist * depth_factor;
            continue;
        }
        if dist < EPSILON {
            return depth;
        }
        depth += dist * depth_factor;
        if depth >= ubo.camera.far {
            return -1;
        }
    }
    return -1;
}

@fragment 
fn fs(in: VertOut) -> @location(0) vec4f {
    let dir = normalize(in.dir);
    let depth = intersec(ubo.viewer.pos, dir, ubo.camera.near);
    if depth == -1 {
        return vec4f(0, 0, 0, 1);
    }
    let intersection = ubo.viewer.pos + dir * depth;
    let normal = calcNormal(intersection);

    let material = MATERIALS[u32(sceneSDF(ubo.viewer.pos + dir * depth).y)];
    let color = material.color;

    let amb_light = AmbientLight(vec4f(1, 1, 1, 0.05));
    var diffuse = amb_light.color.xyz * amb_light.color.w;
        {
        let l_dir = normalize(vec3f(-1, -1, 0));
        let l_pos = intersection - l_dir * 10;
        let light = DirectionalLight(vec4f(1, 1, 1, 0.5), l_dir);
        // diffuse += light.color.xyz * light.color.w * max(-dot(light.dir, normal), 0);
        let l_proj = l_pos + l_dir * intersec(l_pos, l_dir, 0);
        let diff = abs(intersection - l_proj);
        diffuse += select(
            vec3f(0), light.color.xyz * light.color.w * max(-dot(light.dir, normal), 0), dot(diff, diff) < 0.001
        );
    }

    return vec4f(color.xyz * diffuse, 1);
    // return vec4f((normal + vec3f(1)) / 2, 1);
}
