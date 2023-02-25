@compute
@workgroup_size(128, 1, 1)
fn test_wide_mul(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        return;
    }

    let a = g_a[gid.x];
    let b = g_b[gid.x];

    let c = wide_mul(a, b);

    g_c[gid.x] = c.lo;
    g_c[g_len + gid.x] = c.hi;
}