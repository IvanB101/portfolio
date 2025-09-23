const PI = 3.14159;

struct Uniform {
    OtW: mat4x4f, // object to world
    WtC: mat4x4f, // world to camera
    P: mat4x4f, // projection
    @align(16) N: mat3x3f, // normal transform
    @align(16) t: f32,
}

struct Vertex {
    @location(0) pos: vec3f,
    @location(1) normal: vec3f,
}

struct Fragment {
    @builtin(position) NDC: vec4f,
    @location(0) wpos: vec3f,
    @location(1) normal: vec3f,
}

@group(0) @binding(0) var<uniform> ubo: Uniform;

fn roty(v: vec3f, a: f32) -> vec3f {
    let mat = mat2x2f(
        cos(a), -sin(a), sin(a), cos(a)
    );
    let temp = mat * v.xz;
    return vec3f(temp.x, v.y, temp.y);
}

@vertex
fn vs(in: Vertex) -> Fragment {
    let wpos = ubo.OtW * vec4f(in.pos, 1);
    let NDC = ubo.P * ubo.WtC * wpos;
    let normal = ubo.N * in.normal;

    return Fragment(NDC, wpos.xyz, normal);
}

@fragment
fn fs(in: Fragment) -> @location(0) vec4f {
    let color = vec3f(1);
    var light = vec3f(1) * 0.05;

        {
        let lc = vec3f(1) * 0.5;
        let ld = normalize(vec3f(-1, -1, 0));

        let dir = dot(normalize(in.normal), -ld) * lc;
        light += max(dir, vec3f(0));
    }

    return vec4f(color * light, 1);
}
