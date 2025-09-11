const PI = 3.1415926536;
const EPSILON = 0.01;

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
    spec_strength: f32,
    shininnes: f32,
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

fn reflect(v: vec3f, n: vec3f) -> vec3f {
    return v - 2 * dot(v, n) * n;
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

fn smin(a: f32, b: f32, k: f32) -> f32 {
    let h = max(k - abs(a - b), 0);
    return min(a, b) - (0.25 / k) * h * h;
}

fn sphereSDF(p: vec3f, r: f32) -> f32 {
    return length(p) - r;
}

fn boxSDF(p: vec3f, r: vec3f) -> f32 {
    return length(max(abs(p) - r, vec3f(0)));
}

// INFO: scene
fn sceneSDF(in_p: vec3f) -> vec2f {
    let alpha = f32(ubo.time) / 1000 / 10 * 2 * PI;
    let temp = mat2x2(cos(alpha), -sin(alpha), sin(alpha), cos(alpha)) * in_p.xz;
    let p = vec3f(temp.x, in_p.y, temp.y);

    var dist = vec2f(1e20, 0);

        {
        dist = vec2f(boxSDF(p, vec3f(0.5, 1.5, 0.5)) - 0.00, 0);
    }
        {
        let sphere = sphereSDF(p, 1);
        let d = smin(dist.x, sphere, 0.5);
        dist = vec2f(d, 0);
    }
        {
        let plane = p.y + 1;
        dist = select(vec2f(plane, 1), dist, plane > dist.x);
    }

    return dist;
}

fn calcNormal(p: vec3f) -> vec3f {
    let eps = 0.00001;
    let k1 = vec3(eps, -eps, -eps);
    let k2 = vec3(-eps, -eps, eps);
    let k3 = vec3(-eps, eps, -eps);
    let k4 = vec3(eps, eps, eps);

    return normalize(
        k1 * sceneSDF(p + k1).x + k2 * sceneSDF(p + k2).x + k3 * sceneSDF(p + k3).x + k4 * sceneSDF(p + k4).x
    );
}

const MAX_MARCHING_STEPS: u32 = 100;

const MATERIALS = array<Material, 2>(
    Material(0.5, 32, vec4f(1, 0, 0, 1)),
    Material(0.5, 32, vec4f(0, 1, 0, 1)),
);

// let depth_factor = 1.0;

fn intersec(pos: vec3f, dir: vec3f, initial_depth: f32) -> f32 {
    var depth = initial_depth;

    for (var i: u32 = 0; i < MAX_MARCHING_STEPS && depth < ubo.camera.far; i++) {
        let dist = abs(sceneSDF(pos + dir * depth).x);
        if dist < EPSILON {
            return depth + dist;
        }
        depth += dist;
    }

    return -1;
}

// TODO: soft shadows
// fn shadow(s: vec3f, l_pos: vec3f, k: f32) -> f32 {
//     var res = 1.0;
//     var t = 0.0;
//     var ph = 1e20;
//     let dir = normalize(s - l_pos);
//     let maxT = length(s - l_pos);
//
//     for (var i: u32 = 0; i < MAX_MARCHING_STEPS; i++) {
//         let h = sceneSDF(l_pos + dir * t).x;
//         if t + h >= maxT - EPSILON * 10 {
//             break;
//         }
//         if h < EPSILON {
//             return 0;
//         }
//         let y = ph - h * h / (2 * ph) - ph;
//         let d = sqrt(h * h - y * y);
//         // res = min(res, k * h / t);
//         res = min(res, k * d / max(0.0, t - y));
//         ph = h;
//         t += h;
//     }
//
//     return res;
// }

fn shadow(s: vec3f, l_pos: vec3f, k: f32) -> f32 {
    let dir = normalize(s - l_pos);
    var t = 0.0;

    for (var i: u32 = 0; i < MAX_MARCHING_STEPS; i++) {
        let h = sceneSDF(l_pos + dir * t).x;
        if h < EPSILON {
            break;
        }
        t += h;
    }

    return f32(length((l_pos + dir * t) - s) < EPSILON * 5);
}

fn color(intersection: vec3f, viewDir: vec3f) -> vec4f {
    let normal = calcNormal(intersection);

    let material = MATERIALS[u32(sceneSDF(intersection).y)];

    let ambLight = AmbientLight(vec4f(1, 1, 1, 0.05));
    var diffuse = ambLight.color.xyz * ambLight.color.w;
    var specular = vec4f(0);

        {
        let lDir = normalize(vec3f(-1, -1, 0));
        let lPos = intersection - lDir * 10;
        let light = DirectionalLight(vec4f(1, 1, 1, 0.5), lDir);
        let lProj = lPos + lDir * intersec(lPos, lDir, 0);
        let diff = abs(intersection - lProj);
        diffuse += light.color.xyz * light.color.w * max(-dot(light.dir, normal), 0) * shadow(intersection, lPos, 50);

        let refDir = reflect(-lDir, normal);
        let spec = pow(max(dot(viewDir, refDir), 0.0), material.shininnes);
        specular += spec * material.spec_strength * light.color;
    }

    return vec4f(material.color.xyz * (diffuse + specular.xyz + ambLight.color.xyz * ambLight.color.w), 1);
}

fn normals(intersection: vec3f) -> vec4f {
    let normal = calcNormal(intersection);
    return vec4f((normal + vec3f(1)) / 2, 1);
}

fn iterations(in: VertOut) -> vec4f {
    let pos = ubo.viewer.pos;
    let dir = normalize(in.dir);
    var depth = ubo.camera.near;

    for (var i: u32 = 0; i < MAX_MARCHING_STEPS && depth < ubo.camera.far; i++) {
        let dist = abs(sceneSDF(pos + dir * depth).x);
        if dist < EPSILON {
            let threshold = 15.0;
            let value = (max(f32(i) - threshold, 0) / (f32(MAX_MARCHING_STEPS) - threshold));
            return vec4f(vec3f(value), 1);
        }
        depth += dist;
    }

    return vec4f(vec3f(0), 1);
}

fn iterShadows(intersection: vec3f) -> vec4f {
    let normal = calcNormal(intersection);

    let dir = normalize(vec3f(-1, -1, 0));
    let l_pos = intersection - dir * 10;

    var t = 0.0;
    var i: u32 = 0;

    for (; i < MAX_MARCHING_STEPS; i++) {
        let h = sceneSDF(l_pos + dir * t).x;
        if h < EPSILON {
            break;
        }
        t += h;
    }

    let threshold = 10.0;
    let value = (max(f32(i) - threshold, 0) / (f32(MAX_MARCHING_STEPS) - threshold));
    return vec4f(vec3f(value), 1);
}

@fragment 
fn fs(in: VertOut) -> @location(0) vec4f {
    let dir = normalize(in.dir);
    let depth = intersec(ubo.viewer.pos, dir, ubo.camera.near);
    if depth == -1 {
        return vec4f(0, 0, 0, 1);
    }

    let intersection = ubo.viewer.pos + dir * depth;
    return color(intersection, dir);
    // return normals(intersection);
    // return iterations(in);
    // return iterShadows(intersection);
}
