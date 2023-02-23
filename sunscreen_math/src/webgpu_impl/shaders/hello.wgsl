@group(0) @binding(0) var<storage, read> a : array<u32>;
@group(0) @binding(1) var<storage, read> b : array<u32>;
@group(0) @binding(2) var<storage, read_write> c : array<u32>;
@group(0) @binding(3) var<storage, read_write> len : u32;

@compute
@workgroup_size(128, 1, 1)
fn add(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x < len {
        c[gid.x] = a[gid.x] + b[gid.x];
    }
}
