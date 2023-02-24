@compute
@workgroup_size(128, 1, 1)
fn add(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x < g_len {
        g_c[gid.x] = g_a[gid.x] + g_b[gid.x];
    }
}
