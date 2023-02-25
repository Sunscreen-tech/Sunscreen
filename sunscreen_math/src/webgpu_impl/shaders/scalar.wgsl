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
    var ab = montgomery_reduce(mul_internal(&a, &b));

    var rr = Scalar29_RR;
    return montgomery_reduce(mul_internal(&ab, &rr));
}


fn mul_internal(a: ptr<function, Scalar29>, b: ptr<function, Scalar29>) -> u64 {
    u64 z;

    z[0] = m(a[0], b[0]);                                                                 // c00
    z[1] = m(a[0], b[1]) + m(a[1], b[0]);                                                 // c01
    z[2] = m(a[0], b[2]) + m(a[1], b[1]) + m(a[2], b[0]);                                 // c02
    z[3] = m(a[0], b[3]) + m(a[1], b[2]) + m(a[2], b[1]) + m(a[3], b[0]);                 // c03
    z[4] = m(a[0], b[4]) + m(a[1], b[3]) + m(a[2], b[2]) + m(a[3], b[1]) + m(a[4], b[0]); // c04
    z[5] =                 m(a[1], b[4]) + m(a[2], b[3]) + m(a[3], b[2]) + m(a[4], b[1]); // c05
    z[6] =                                 m(a[2], b[4]) + m(a[3], b[3]) + m(a[4], b[2]); // c06
    z[7] =                                                 m(a[3], b[4]) + m(a[4], b[3]); // c07
    z[8] =                                                                (m(a[4], b[4])) - z[3]; // c08 - c03

    z[10] = z[5] - m(a[5], b[5]);                                                        // c05mc10
    z[11] = z[6] - (m(a[5], b[6]) + m(a[6], b[5]));                                      // c06mc11
    z[12] = z[7] - (m(a[5], b[7]) + m(a[6], b[6]) + m(a[7], b[5]));                      // c07mc12
    z[13] =                   m(a[5], b[8]) + m(a[6], b[7]) + m(a[7], b[6]) + m(a[8], b[5]); // c13
    z[14] =                                   m(a[6], b[8]) + m(a[7], b[7]) + m(a[8], b[6]); // c14
    z[15] =                                                   m(a[7], b[8]) + m(a[8], b[7]); // c15
    z[16] =                                                                   m(a[8], b[8]); // c16

    z[ 5] = z[10] - (z[ 0]); // c05mc10 - c00
    z[ 6] = z[11] - (z[ 1]); // c06mc11 - c01
    z[ 7] = z[12] - (z[ 2]); // c07mc12 - c02
    z[ 8] = z[ 8] - (z[13]); // c08mc13 - c03
    z[ 9] = z[14] + (z[ 4]); // c14 + c04
    z[10] = z[15] + (z[10]); // c15 + c05mc10
    z[11] = z[16] + (z[11]); // c16 + c06mc11

    u64 aa[] = {
        a[0] + a[5],
        a[1] + a[6],
        a[2] + a[7],
        a[3] + a[8]
    };

    u64 bb[] = {
        b[0] + b[5],
        b[1] + b[6],
        b[2] + b[7],
        b[3] + b[8]
    };

    z[ 5] = (m(aa[0], bb[0]))                                                                        + (z[ 5]); // c20 + c05mc10 - c00
    z[ 6] = (m(aa[0], bb[1]) + m(aa[1], bb[0]))                                                      + (z[ 6]); // c21 + c06mc11 - c01
    z[ 7] = (m(aa[0], bb[2]) + m(aa[1], bb[1]) + m(aa[2], bb[0]))                                    + (z[ 7]); // c22 + c07mc12 - c02
    z[ 8] = (m(aa[0], bb[3]) + m(aa[1], bb[2]) + m(aa[2], bb[1]) + m(aa[3], bb[0]))                  + (z[ 8]); // c23 + c08mc13 - c03
    z[ 9] = (m(aa[0],  b[4]) + m(aa[1], bb[3]) + m(aa[2], bb[2]) + m(aa[3], bb[1]) + m(a[4], bb[0])) - (z[ 9]); // c24 - c14 - c04
    z[10] = (                  m(aa[1],  b[4]) + m(aa[2], bb[3]) + m(aa[3], bb[2]) + m(a[4], bb[1])) - (z[10]); // c25 - c15 - c05mc10
    z[11] = (                                    m(aa[2],  b[4]) + m(aa[3], bb[3]) + m(a[4], bb[2])) - (z[11]); // c26 - c16 - c06mc11
    z[12] = (                                                      m(aa[3],  b[4]) + m(a[4], bb[3])) - (z[12]); // c27 - c07mc12

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