struct Radix16 {
    v: array<i32, 64>
}

struct Scalar29 {
    v: array<u32, 9>
}

struct Foo {
    v: array<u32>
}

// WGSL is terrible in that you can't pass arrays of unknown length to functions. So, we create
// functions for unpacking bindings a, b respectively.
fn scalar29_unpack_a(grid_tid: u32, stride: u32) -> Scalar29 {
    let mask = (1u << 29u) - 1u;
    let top_mask = (1u << 24u) - 1u;
    var s = Scalar29_Zero;

    s.v[0] =   g_a[0u * stride + grid_tid]                                                 & mask;
    s.v[1] = ((g_a[0u * stride + grid_tid] >> 29u) | (g_a[1u * stride + grid_tid] <<  3u)) & mask;
    s.v[2] = ((g_a[1u * stride + grid_tid] >> 26u) | (g_a[2u * stride + grid_tid] <<  6u)) & mask;
    s.v[3] = ((g_a[2u * stride + grid_tid] >> 23u) | (g_a[3u * stride + grid_tid] <<  9u)) & mask;
    s.v[4] = ((g_a[3u * stride + grid_tid] >> 20u) | (g_a[4u * stride + grid_tid] << 12u)) & mask;
    s.v[5] = ((g_a[4u * stride + grid_tid] >> 17u) | (g_a[5u * stride + grid_tid] << 15u)) & mask;
    s.v[6] = ((g_a[5u * stride + grid_tid] >> 14u) | (g_a[6u * stride + grid_tid] << 18u)) & mask;
    s.v[7] = ((g_a[6u * stride + grid_tid] >> 11u) | (g_a[7u * stride + grid_tid] << 21u)) & mask;
    s.v[8] =  (g_a[7u * stride + grid_tid] >>  8u)                                         & top_mask;

    return s;
}

fn scalar29_unpack_b(grid_tid: u32, stride: u32) -> Scalar29 {
    let mask = (1u << 29u) - 1u;
    let top_mask = (1u << 24u) - 1u;
    var s = Scalar29_Zero;

    s.v[0] =   g_b[0u * stride + grid_tid]                                                 & mask;
    s.v[1] = ((g_b[0u * stride + grid_tid] >> 29u) | (g_b[1u * stride + grid_tid] <<  3u)) & mask;
    s.v[2] = ((g_b[1u * stride + grid_tid] >> 26u) | (g_b[2u * stride + grid_tid] <<  6u)) & mask;
    s.v[3] = ((g_b[2u * stride + grid_tid] >> 23u) | (g_b[3u * stride + grid_tid] <<  9u)) & mask;
    s.v[4] = ((g_b[3u * stride + grid_tid] >> 20u) | (g_b[4u * stride + grid_tid] << 12u)) & mask;
    s.v[5] = ((g_b[4u * stride + grid_tid] >> 17u) | (g_b[5u * stride + grid_tid] << 15u)) & mask;
    s.v[6] = ((g_b[5u * stride + grid_tid] >> 14u) | (g_b[6u * stride + grid_tid] << 18u)) & mask;
    s.v[7] = ((g_b[6u * stride + grid_tid] >> 11u) | (g_b[7u * stride + grid_tid] << 21u)) & mask;
    s.v[8] =  (g_b[7u * stride + grid_tid] >>  8u)                                         & top_mask;

    return s;
}

fn scalar29_pack_c(val: ptr<function, Scalar29>, grid_tid: u32, stride: u32) {
    let val = *val;
    
    var word: u32 = val.v[0u] | val.v[1u] << 29u;

    g_c[0u * stride + grid_tid] = word;
    word = val.v[1] >> 3u | val.v[2u] << 26u;
    g_c[1u * stride + grid_tid] = word;
    word = val.v[2] >> 6u | val.v[3u] << 23u;
    g_c[2u * stride + grid_tid] = word;
    word = val.v[3] >> 9u | val.v[4u] << 20u;
    g_c[3u * stride + grid_tid] = word;
    word = val.v[4] >> 12u | val.v[5u] << 17u;
    g_c[4u * stride + grid_tid] = word;
    word = val.v[5] >> 15u | val.v[6u] << 14u;
    g_c[5u * stride + grid_tid] = word;
    word = val.v[6] >> 18u | val.v[7u] << 11u;
    g_c[6u * stride + grid_tid] = word;
    word = val.v[7] >> 21u | val.v[8u] << 8u;
    g_c[7u * stride + grid_tid] = word;
}

fn scalar29_add(a: ptr<function, Scalar29>, b: ptr<function, Scalar29>) -> Scalar29 {
    var sum = Scalar29_Zero;
    let mask = (0x1u << 29u) - 1u;

    // a + b
    var carry = 0u;
    for (var i = 0u; i < 9u; i++) {
        carry = (*a).v[i] + (*b).v[i] + (carry >> 29u);
        sum.v[i] = carry & mask;
    }

    // subtract l if the sum is >= l
    var l = Scalar29_L;
    return scalar29_sub(&sum, &l);
}

fn scalar29_sub(a: ptr<function, Scalar29>, b: ptr<function, Scalar29>) -> Scalar29 {
    var difference = Scalar29_Zero;
    let mask = (1u << 29u) - 1u;
    var l = Scalar29_L;

    // a - b
    var borrow = 0u;
    for (var i = 0u; i < 9u; i++) {
        borrow = (*a).v[i] - ((*b).v[i] + (borrow >> 31u));
        difference.v[i] = borrow & mask;
    }

    // conditionally add l if the difference is negative
    let underflow_mask = ((borrow >> 31u) ^ 1u) - 1u;

    var carry = 0u;
    for (var i = 0u; i < 9u; i++) {
        carry = (carry >> 29u) + difference.v[i] + (l.v[i] & underflow_mask);

        difference.v[i] = carry & mask;
    }

    return difference;
}

/*
fn scalar29_mul(a: ptr<function, Scalar29>, b: ptr<function, Scalar29>) -> Scalar29 {
    var ab = montgomery_reduce(mul_internal(a, b));

    var rr = Scalar29_RR;
    return montgomery_reduce(mul_internal(&ab, &rr));
}

// TODO
fn montgomery_reduce(a: array<u64, 17>, b: array<u64, 17>) -> Scalar29 {
    return Scalar29_Zero;
}

fn mul_internal(a: ptr<function, Scalar29>, b: ptr<function, Scalar29>) -> array<u64, 17> {
    var z: array<u64, 17>;

    // c00
    z[0] = mul_wide((*a).v[0], (*b).v[0]); 

    // c01
    let z_11 = mul_wide((*a).v[0], (*b).v[1]);
    let z_12 = mul_wide((*a).v[1], (*b).v[0]);
    z[1] = u64_add(z_11, z_12);

    // c02
    let z_21 = mul_wide((*a).v[0], (*b).v[2]);
    let z_22 = mul_wide((*a).v[1], (*b).v[1]);
    let z_23 = mul_wide((*a).v[2], (*b).v[0]);
    z[2] = u64_add(u64_add(z_21, z_22), z_23);

    // c03
    let z_31 = mul_wide((*a).v[0], (*b).v[3]);
    let z_32 = mul_wide((*a).v[1], (*b).v[2]);
    let z_33 = mul_wide((*a).v[2], (*b).v[1]);
    let z_34 = mul_wide((*a).v[3], (*b).v[0]);
    z[3] = u64_add(u64_add(u64_add(z_31, z_32), z_33), z_34);

    // c04
    let z_41 = mul_wide((*a).v[0], (*b).v[4]);
    let z_42 = mul_wide((*a).v[1], (*b).v[3]);
    let z_43 = mul_wide((*a).v[2], (*b).v[2]);
    let z_44 = mul_wide((*a).v[3], (*b).v[1]);
    let z_45 = mul_wide((*a).v[4], (*b).v[0]);
    z[4] = u64_add(u64_add(u64_add(u64_add(z_41, z_42), z_43), z_44), z_45);
    
    // c05
    let z_51 = mul_wide((*a).v[1], (*b).v[4]);
    let z_52 = mul_wide((*a).v[2], (*b).v[3]);
    let z_53 = mul_wide((*a).v[3], (*b).v[2]);
    let z_54 = mul_wide((*a).v[4], (*b).v[1]);
    z[5] = u64_add(u64_add(u64_add(z_51, z_52), z_53), z_54);

    // c06
    let z_61 = mul_wide((*a).v[2], (*b).v[4]);
    let z_62 = mul_wide((*a).v[3], (*b).v[3]);
    let z_63 = mul_wide((*a).v[4], (*b).v[2]);
    z[6] = u64_add(u64_add(z_61, z_62), z_63);

    // c07
    let z_71 = mul_wide((*a).v[3], (*b).v[4]);
    let z_72 = mul_wide((*a).v[4], (*b).v[3]);
    z[7] = u64_add(z_71, z_72);

     // c08 - c03
    let z_81 = mul_wide((*a).v[4], (*b).v[4]);
    z[8] = u64_sub(z_81, z[3]);

    z[10] = z[5] - mul_wide((*a).v[5], (*b).v[5]);                                                        // c05mc10
    z[11] = z[6] - (mul_wide((*a).v[5], (*b).v[6]) + mul_wide((*a).v[6], (*b).v[5]));                                      // c06mc11
    z[12] = z[7] - (mul_wide((*a).v[5], (*b).v[7]) + mul_wide((*a).v[6], (*b).v[6]) + mul_wide((*a).v[7], (*b).v[5]));                      // c07mc12
    z[13] =                   mul_wide((*a).v[5], (*b).v[8]) + mul_wide((*a).v[6], (*b).v[7]) + mul_wide((*a).v[7], (*b).v[6]) + mul_wide((*a).v[8], (*b).v[5]); // c13
    z[14] =                                   mul_wide((*a).v[6], (*b).v[8]) + mul_wide((*a).v[7], (*b).v[7]) + mul_wide((*a).v[8], (*b).v[6]); // c14
    z[15] =                                                   mul_wide((*a).v[7], (*b).v[8]) + mul_wide((*a).v[8], (*b).v[7]); // c15
    z[16] =                                                                   mul_wide((*a).v[8], (*b).v[8]); // c16

    z[ 5] = z[10] - (z[ 0]); // c05mc10 - c00
    z[ 6] = z[11] - (z[ 1]); // c06mc11 - c01
    z[ 7] = z[12] - (z[ 2]); // c07mc12 - c02
    z[ 8] = z[ 8] - (z[13]); // c08mc13 - c03
    z[ 9] = z[14] + (z[ 4]); // c14 + c04
    z[10] = z[15] + (z[10]); // c15 + c05mc10
    z[11] = z[16] + (z[11]); // c16 + c06mc11

    let aa = array<u32, 4>(
        (*a).v[0] + (*a).v[5],
        (*a).v[1] + (*a).v[6],
        (*a).v[2] + (*a).v[7],
        (*a).v[3] + (*a).v[8]
    );

    let bb = array<u32, 4>(
        (*b).v[0] + (*b).v[5],
        (*b).v[1] + (*b).v[6],
        (*b).v[2] + (*b).v[7],
        (*b).v[3] + (*b).v[8]
    );


    z[ 5] = (mul_wide(aa[0], bb[0]))                                                                        + (z[ 5]); // c20 + c05mc10 - c00
    z[ 6] = (mul_wide(aa[0], bb[1]) + mul_wide(aa[1], bb[0]))                                                      + (z[ 6]); // c21 + c06mc11 - c01
    z[ 7] = (mul_wide(aa[0], bb[2]) + mul_wide(aa[1], bb[1]) + mul_wide(aa[2], bb[0]))                                    + (z[ 7]); // c22 + c07mc12 - c02
    z[ 8] = (mul_wide(aa[0], bb[3]) + mul_wide(aa[1], bb[2]) + mul_wide(aa[2], bb[1]) + mul_wide(aa[3], bb[0]))                  + (z[ 8]); // c23 + c08mc13 - c03
    z[ 9] = (mul_wide(aa[0],  (*b).v[4]) + mul_wide(aa[1], bb[3]) + mul_wide(aa[2], bb[2]) + mul_wide(aa[3], bb[1]) + mul_wide((*a).v[4], bb[0])) - (z[ 9]); // c24 - c14 - c04
    z[10] = (                  mul_wide(aa[1],  (*b).v[4]) + mul_wide(aa[2], bb[3]) + mul_wide(aa[3], bb[2]) + mul_wide((*a).v[4], bb[1])) - (z[10]); // c25 - c15 - c05mc10
    z[11] = (                                    mul_wide(aa[2],  (*b).v[4]) + mul_wide(aa[3], bb[3]) + mul_wide((*a).v[4], bb[2])) - (z[11]); // c26 - c16 - c06mc11
    z[12] = (                                                      mul_wide(aa[3],  (*b).v[4]) + mul_wide((*a).v[4], bb[3])) - (z[12]); // c27 - c07mc12

    return z;
}*/

@compute
@workgroup_size(128, 1, 1)
fn kernel_scalar29_sub(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        return;
    }

    var a = scalar29_unpack_a(gid.x, g_len);
    var b = scalar29_unpack_b(gid.x, g_len);

    var c = scalar29_sub(&a, &b);

    scalar29_pack_c(&c, gid.x, g_len);
}

@compute
@workgroup_size(128, 1, 1)
fn kernel_scalar29_add(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        return;
    }

    var a = scalar29_unpack_a(gid.x, g_len);
    var b = scalar29_unpack_b(gid.x, g_len);

    var c = scalar29_add(&a, &b);

    scalar29_pack_c(&c, gid.x, g_len);
}

@compute
@workgroup_size(128, 1, 1)
fn kernel_scalar29_neg(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        unused_b();
        return;
    }

    var a = scalar29_unpack_a(gid.x, g_len);
    var zero = Scalar29_Zero;

    var c = scalar29_sub(&zero, &a);

    scalar29_pack_c(&c, gid.x, g_len);
}