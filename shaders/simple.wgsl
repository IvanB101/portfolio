const PI = 3.1415926536;

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

struct Intersec {
    depth: f32,
    id_material: u32,
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

fn unionSDF(i1: Intersec, i2: Intersec) -> Intersec {
    if i1.depth < i2.depth {
        return i1;
    } else {
        return i2;
    }
}

fn intersecSDF(i1: Intersec, i2: Intersec, use_second_material: bool) -> Intersec {
    return Intersec(
        select(i1.depth, i2.depth, i1.depth < i2.depth),
        select(i1.id_material, i2.id_material, use_second_material),
    );
}

fn subtractSDF(i1: Intersec, i2: Intersec, tint: bool) -> Intersec {
    return Intersec(
        select(i1.depth, -i2.depth, i1.depth < -i2.depth),
        select(i1.id_material, i2.id_material, i1.depth < -i2.depth && tint),
    );
}

fn sphereSDF(p: vec3f, r: f32) -> f32 {
    return length(p) - r;
}

fn boxSDF(p: vec3f, r: vec3f) -> f32 {
    return length(max(abs(p) - r, vec3f(0)));
}

fn sceneSDF(in_p: vec3f) -> Intersec {
    let alpha = f32(ubo.time) / 1000 / 10 * 2 * PI;
    let temp = mat2x2(cos(alpha), -sin(alpha), sin(alpha), cos(alpha)) * in_p.xz;
    let p = vec3f(temp.x, in_p.y, temp.y);
    // let p = in_p;

    return Intersec(boxSDF(p, vec3f(0.5, 0.5, 0.5)) - 0.3, 0);
    // return unionSDF(
    //     Intersec(sphereSDF(p + vec3f(0.5, 0, 0), 1), 0),
    //     Intersec(sphereSDF(p + vec3f(-0.5, 0, 0), 1), 1),
    // );
}

fn aproxGrad(p: vec3f) -> vec3f {
    let delta = 0.0001;

    return normalize(vec3f(
        sceneSDF(vec3f(p.x + delta, p.y, p.z)).depth - sceneSDF(vec3f(p.x - delta, p.y, p.z)).depth,
        sceneSDF(vec3f(p.x, p.y + delta, p.z)).depth - sceneSDF(vec3f(p.x, p.y - delta, p.z)).depth,
        sceneSDF(vec3f(p.x, p.y, p.z + delta)).depth - sceneSDF(vec3f(p.x, p.y, p.z - delta)).depth
    ));
}

const MAX_MARCHING_STEPS: u32 = 100;
const EPSILON: f32 = 0.01;

const MATERIALS = array<Material, 2>(
    Material(vec4f(1, 0, 0, 1)),
    Material(vec4f(0, 1, 0, 1)),
);

@fragment 
fn fs(in: VertOut) -> @location(0) vec4f {
    let dir = normalize(in.dir);
    // TODO: control not starting inside a volume
    var depth = ubo.camera.near;
    for (var i: u32 = 0; i < MAX_MARCHING_STEPS; i++) {
        let dist = sceneSDF(ubo.viewer.pos + dir * depth).depth;
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

    let material = MATERIALS[sceneSDF(ubo.viewer.pos + dir * depth).id_material];
    let color = material.color;

    let dir_light = DirectionalLight(vec4f(1, 1, 1, 0.5), normalize(vec3f(-1, -1, 0)));
    let amb_light = AmbientLight(vec4f(1, 1, 1, 0.05));

    var diffuse = dir_light.color.xyz * dir_light.color.w * max(-dot(dir_light.dir, gradient), 0);
    diffuse += amb_light.color.xyz * amb_light.color.w;

    return vec4f(color.xyz * diffuse, 1);
}
