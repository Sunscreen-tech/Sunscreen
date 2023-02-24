@compute
@workgroup_size(128, 1, 1)
fn test_scalar_can_pack_unpack_a(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        return;
    }

    let a = scalar29_unpack_a(gid.x, g_len);
    scalar29_pack_c(a, gid.x, g_len);
}