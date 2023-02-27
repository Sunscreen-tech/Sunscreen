@compute
@workgroup_size(128, 1, 1)
fn test_scalar_can_pack_unpack_a(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        unused_b();
        return;
    }

    var a = scalar29_unpack_a(gid.x, g_len);
    scalar29_pack_c(&a, gid.x, g_len);
}

@compute
@workgroup_size(128, 1, 1)
fn test_scalar_can_pack_unpack_b(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        unused_b();
        return;
    }

    var b = scalar29_unpack_b(gid.x, g_len);
    scalar29_pack_c(&b, gid.x, g_len);
}

@compute
@workgroup_size(128, 1, 1)
fn test_scalar_montgomery_reduce_part1(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        unused_b();
        return;
    }

    let a = u64(g_a[gid.x], g_a[gid.x + g_len]);
 
    let b = part1(a);

    g_c[gid.x] = b.carry.lo;
    g_c[gid.x + g_len] = b.carry.hi;
    g_c[gid.x + 2u * g_len] = b.n;
}