@group(0) @binding(0) var<storage, read_write> data: array<f32>;

@compute @workgroup_size(8,8,1)
fn init(
    @builtin(global_invocation_id) id: vec3<u32>
) {
}

@compute @workgroup_size(8,8,1)
fn update(
    @builtin(global_invocation_id) id: vec3<u32>
) {
}
