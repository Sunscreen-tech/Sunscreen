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

    let c = mul_wide(a, b);

    g_c[gid.x] = c.lo;
    g_c[g_len + gid.x] = c.hi;
}

@compute
@workgroup_size(128, 1, 1)
fn test_u64_add(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        return;
    }

    let a = u64(g_a[gid.x], g_a[gid.x + g_len]);
    let b = u64(g_b[gid.x], g_b[gid.x + g_len]);

    let c = u64_add(a, b);

    g_c[gid.x] = c.lo;
    g_c[g_len + gid.x] = c.hi;
}

@compute
@workgroup_size(128, 1, 1)
fn test_u64_sub(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        return;
    }

    let a = u64(g_a[gid.x], g_a[gid.x + g_len]);
    let b = u64(g_b[gid.x], g_b[gid.x + g_len]);

    let c = u64_sub(a, b);

    g_c[gid.x] = c.lo;
    g_c[g_len + gid.x] = c.hi;
}