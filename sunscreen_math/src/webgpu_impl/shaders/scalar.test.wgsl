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

@compute
@workgroup_size(128, 1, 1)
fn test_scalar_montgomery_reduce_part2(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        unused_b();
        return;
    }

    let a = u64(g_a[gid.x], g_a[gid.x + g_len]);
 
    let b = part2(a);

    g_c[gid.x] = b.carry.lo;
    g_c[gid.x + g_len] = b.carry.hi;
    g_c[gid.x + 2u * g_len] = b.n;
}

@compute
@workgroup_size(128, 1, 1)
fn test_scalar_mul_internal(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        return;
    }

    var a = scalar29_unpack_a(gid.x, g_len);
    var b = scalar29_unpack_b(gid.x, g_len);
    var c = scalar29_mul_internal(&a, &b);

    g_c[gid.x + 0u * g_len] = c[0].lo;
    g_c[gid.x + 1u * g_len] = c[0].hi;
    g_c[gid.x + 2u * g_len] = c[1].lo;
    g_c[gid.x + 3u * g_len] = c[1].hi;
    g_c[gid.x + 4u * g_len] = c[2].lo;
    g_c[gid.x + 5u * g_len] = c[2].hi;
    g_c[gid.x + 6u * g_len] = c[3].lo;
    g_c[gid.x + 7u * g_len] = c[3].hi;
    g_c[gid.x + 8u * g_len] = c[4].lo;
    g_c[gid.x + 9u * g_len] = c[4].hi;
    g_c[gid.x + 10u * g_len] = c[5].lo;
    g_c[gid.x + 11u * g_len] = c[5].hi;
    g_c[gid.x + 12u * g_len] = c[6].lo;
    g_c[gid.x + 13u * g_len] = c[6].hi;
    g_c[gid.x + 14u * g_len] = c[7].lo;
    g_c[gid.x + 15u * g_len] = c[7].hi;
    g_c[gid.x + 16u * g_len] = c[8].lo;
    g_c[gid.x + 17u * g_len] = c[8].hi;
    g_c[gid.x + 18u * g_len] = c[9].lo;
    g_c[gid.x + 19u * g_len] = c[9].hi;
    g_c[gid.x + 20u * g_len] = c[10].lo;
    g_c[gid.x + 21u * g_len] = c[10].hi;
    g_c[gid.x + 22u * g_len] = c[11].lo;
    g_c[gid.x + 23u * g_len] = c[11].hi;
    g_c[gid.x + 24u * g_len] = c[12].lo;
    g_c[gid.x + 25u * g_len] = c[12].hi;
    g_c[gid.x + 26u * g_len] = c[13].lo;
    g_c[gid.x + 27u * g_len] = c[13].hi;
    g_c[gid.x + 28u * g_len] = c[14].lo;
    g_c[gid.x + 29u * g_len] = c[14].hi;
    g_c[gid.x + 30u * g_len] = c[15].lo;
    g_c[gid.x + 31u * g_len] = c[15].hi;
    g_c[gid.x + 32u * g_len] = c[16].lo;
    g_c[gid.x + 33u * g_len] = c[16].hi;
}