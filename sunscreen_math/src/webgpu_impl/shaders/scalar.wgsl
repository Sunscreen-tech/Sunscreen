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


fn scalar29_mul(a: ptr<function, Scalar29>, b: ptr<function, Scalar29>) -> Scalar29 {
    var ab = scalar29_montgomery_reduce(scalar29_mul_internal(a, b));

    var rr = Scalar29_RR;
    return scalar29_montgomery_reduce(scalar29_mul_internal(&ab, &rr));
}

struct MontMulLRes {
    carry: u64 ,
    n: u32 ,
}

fn part1(sum: u64) -> MontMulLRes {
    let p = sum.lo * Scalar29_LFACTOR & ((1u << 29u) - 1u);
    let carry = u64_shr(u64_add(sum, mul_wide(p, Scalar29_L.v[0])), 29u);

    return MontMulLRes(carry, p);
}

fn part2(sum: u64) -> MontMulLRes {
    let w = (sum.lo) & ((1u << 29u) - 1u);
    return MontMulLRes(u64_shr(sum, 29u), w);
}

fn scalar29_montgomery_reduce(limbs: array<u64, 17>) -> Scalar29 {
    // note: l5,l6,l7 are zero, so their multiplies can be skipped
    var l = Scalar29_L;

    // the first half computes the Montgomery adjustment factor n, and begins adding n*l to make limbs divisible by R
    let x0 = part1(limbs[ 0]);
    
    let x_1_1 = mul_wide(x0.n, l.v[1]);
    let x_1_in = u64_add(u64_add(x0.carry, limbs[1]), x_1_1);
    let x1 = part1(x_1_in);

    let x_2_1 = mul_wide(x0.n, l.v[2]);
    let x_2_2 = mul_wide(x1.n, l.v[1]);
    let x_2_in = u64_add(u64_add(u64_add(x1.carry, limbs[2]), x_2_1), x_2_1);
    let x2 = part1(x_2_in);

    let x_3_1 = mul_wide(x0.n, l.v[3]);
    let x_3_2 = mul_wide(x1.n, l.v[2]);
    let x_3_3 = mul_wide(x2.n, l.v[1]);
    let x_3_in = u64_add(u64_add(u64_add(u64_add(x2.carry, limbs[3]), x_3_1), x_3_2), x_3_3);
    let x3 = part1(x_3_in);

    let x_4_1 = mul_wide(x0.n, l.v[4]);
    let x_4_2 = mul_wide(x1.n, l.v[3]);
    let x_4_3 = mul_wide(x2.n, l.v[2]);
    let x_4_4 = mul_wide(x3.n, l.v[1]);
    let x_4_in = u64_add(u64_add(u64_add(u64_add(u64_add(x3.carry, limbs[4]), x_4_1), x_4_2), x_4_3), x_4_4);
    let x4 = part1(x_4_in);

    let x_5_1 = mul_wide(x1.n, l.v[4]);
    let x_5_2 = mul_wide(x2.n, l.v[3]);
    let x_5_3 = mul_wide(x3.n, l.v[2]);
    let x_5_4 = mul_wide(x4.n, l.v[1]);
    let x_5_in = u64_add(u64_add(u64_add(u64_add(u64_add(x4.carry, limbs[5]), x_4_1), x_4_2), x_4_3), x_4_4);
    let x5 = part1(x_5_in);

    let x_6_1 = mul_wide(x2.n, l.v[4]);
    let x_6_2 = mul_wide(x3.n, l.v[3]);
    let x_6_3 = mul_wide(x4.n, l.v[2]);
    let x_6_4 = mul_wide(x5.n, l.v[1]);
    let x_6_in = u64_add(u64_add(u64_add(u64_add(u64_add(x5.carry, limbs[6]), x_6_1), x_6_2), x_6_3), x_6_4);
    let x6 = part1(x_6_in);

    let x_7_1 = mul_wide(x3.n, l.v[4]);
    let x_7_2 = mul_wide(x4.n, l.v[3]);
    let x_7_3 = mul_wide(x5.n, l.v[2]);
    let x_7_4 = mul_wide(x6.n, l.v[1]);
    let x_7_in = u64_add(u64_add(u64_add(u64_add(u64_add(x6.carry, limbs[7]), x_7_1), x_7_2), x_7_3), x_7_4);
    let x7 = part1(x_7_in);
    
    let x_8_1 = mul_wide(x4.n, l.v[4]);
    let x_8_2 = mul_wide(x5.n, l.v[3]);
    let x_8_3 = mul_wide(x6.n, l.v[2]);
    let x_8_4 = mul_wide(x7.n, l.v[1]);
    let x_8_in = u64_add(u64_add(u64_add(u64_add(u64_add(x7.carry, limbs[8]), x_8_1), x_8_2), x_8_3), x_8_4);
    let x8 = part1(x_8_in);

    // limbs is divisible by R now, so we can divide by R by simply storing the upper half as the result
    let r_0_1 = mul_wide(x1.n, l.v[8]);
    let r_0_2 = mul_wide(x5.n, l.v[4]);
    let r_0_3 = mul_wide(x6.n, l.v[3]);
    let r_0_4 = mul_wide(x7.n, l.v[2]);
    let r_0_5 = mul_wide(x8.n, l.v[1]);
    let r_0_in = u64_add(u64_add(u64_add(u64_add(u64_add(u64_add(x8.carry, limbs[9]), r_0_1), r_0_2), r_0_3), r_0_4), r_0_5);
    let r0 = part2(r_0_in);
    
    let r_1_1 = mul_wide(x2.n, l.v[8]);
    let r_1_2 = mul_wide(x6.n, l.v[4]);
    let r_1_3 = mul_wide(x7.n, l.v[3]);
    let r_1_4 = mul_wide(x8.n, l.v[2]);
    let r_1_in = u64_add(u64_add(u64_add(u64_add(u64_add(r0.carry, limbs[10]), r_1_1), r_1_2), r_1_3), r_1_4);
    let r1 = part2(r_1_in);

    let r_2_1 = mul_wide(x3.n, l.v[8]);
    let r_2_2 = mul_wide(x7.n, l.v[4]);
    let r_2_3 = mul_wide(x8.n, l.v[3]);
    let r_2_in = u64_add(u64_add(u64_add(u64_add(r1.carry, limbs[11]), r_2_1), r_2_2), r_2_3);
    let r2 = part2(r_2_in);

    let r_3_1 = mul_wide(x4.n, l.v[8]);
    let r_3_2 = mul_wide(x8.n, l.v[4]);
    let r_3_in = u64_add(u64_add(u64_add(r2.carry, limbs[12]), r_3_1), r_3_2);
    let r3 = part2(r_3_in);

    let r_4_1 = mul_wide(x5.n, l.v[8]);
    let r_4_in = u64_add(u64_add(r3.carry, limbs[13]), r_4_1);
    let r4 = part2(r_4_in);
    
    let r_5_1 = mul_wide(x6.n, l.v[8]);
    let r_5_in = u64_add(u64_add(r4.carry, limbs[14]), r_5_1);
    let r5 = part2(r_5_in);
    
    let r_6_1 = mul_wide(x7.n, l.v[8]);
    let r_6_in = u64_add(u64_add(r5.carry, limbs[15]), r_6_1);
    let r6 = part2(r_6_in);

    let r_7_1 = mul_wide(x8.n, l.v[8]);
    let r_7_in = u64_add(u64_add(r6.carry, limbs[16]), r_7_1);
    let r7 = part2(r_7_in);
    
    let r8 = r7.carry.lo;

    var val = Scalar29(array<u32, 9>(r0.n,r1.n,r2.n,r3.n,r4.n,r5.n,r6.n,r7.n,r8));

    return scalar29_sub(&val, &l);
}

fn scalar29_mul_internal(a: ptr<function, Scalar29>, b: ptr<function, Scalar29>) -> array<u64, 17> {
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

    // c05mc10
    let z_10_1 = mul_wide((*a).v[5], (*b).v[5]);
    z[10] = u64_sub(z[5], z_10_1);

    // c06mc11
    let z_11_1 = mul_wide((*a).v[5], (*b).v[6]);
    let z_11_2 = mul_wide((*a).v[6], (*b).v[5]);
    z[11] = u64_sub(z[6], u64_add(z_11_1, z_11_2));

    // c07mc12
    let z_12_1 = mul_wide((*a).v[5], (*b).v[7]); 
    let z_12_2 = mul_wide((*a).v[6], (*b).v[6]);
    let z_12_3 = mul_wide((*a).v[7], (*b).v[5]);
    z[12] = u64_sub(z[7], u64_add(u64_add(z_12_1, z_12_2), z_12_3));

    // c13
    let z_13_1 = mul_wide((*a).v[5], (*b).v[8]);
    let z_13_2 = mul_wide((*a).v[6], (*b).v[7]);
    let z_13_3 = mul_wide((*a).v[7], (*b).v[6]);
    let z_13_4 = mul_wide((*a).v[8], (*b).v[5]);
    z[13] = u64_add(u64_add(u64_add(z_13_1, z_13_2), z_13_3), z_13_4);

    // c14
    let z_14_1 = mul_wide((*a).v[6], (*b).v[8]);
    let z_14_2 = mul_wide((*a).v[7], (*b).v[7]);
    let z_14_3 = mul_wide((*a).v[8], (*b).v[6]);
    z[14] = u64_add(u64_add(z_14_1, z_14_2), z_14_3);

    // c15
    let z_15_1 = mul_wide((*a).v[7], (*b).v[8]);
    let z_15_2 = mul_wide((*a).v[8], (*b).v[7]);
    z[15] = u64_add(z_15_1, z_15_2);

    // c16
    z[16] = mul_wide((*a).v[8], (*b).v[8]); 

    z[ 5] = u64_sub(z[10], z[ 0]); // c05mc10 - c00
    z[ 6] = u64_sub(z[11], z[ 1]); // c06mc11 - c01
    z[ 7] = u64_sub(z[12], z[ 2]); // c07mc12 - c02
    z[ 8] = u64_sub(z[ 8], z[13]); // c08mc13 - c03
    z[ 9] = u64_add(z[14], z[ 4]); // c14 + c04
    z[10] = u64_add(z[15], z[10]); // c15 + c05mc10
    z[11] = u64_add(z[16], z[11]); // c16 + c06mc11

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

    // c20 + c05mc10 - c00
    let z5_1 = mul_wide(aa[0], bb[0]);
    z[ 5] = u64_add(z5_1, z[ 5]);

    // c21 + c06mc11 - c01
    let z6_1 = mul_wide(aa[0], bb[1]);
    let z6_2 = mul_wide(aa[1], bb[0]);
    z[ 6] = u64_add(u64_add(z6_1, z6_2), z[ 6]);

    // c22 + c07mc12 - c02
    let z7_1 = mul_wide(aa[0], bb[2]);
    let z7_2 = mul_wide(aa[1], bb[1]);
    let z7_3 = mul_wide(aa[2], bb[0]);
    z[ 7] = u64_add(u64_add(u64_add(z7_1, z7_2), z7_3), z[ 7]);

    // c23 + c08mc13 - c03
    let z8_1 = mul_wide(aa[0], bb[3]);
    let z8_2 = mul_wide(aa[1], bb[2]);
    let z8_3 = mul_wide(aa[2], bb[1]);
    let z8_4 = mul_wide(aa[3], bb[0]);
    z[ 8] = u64_add(u64_add(u64_add(u64_add(z8_1, z8_2), z8_3), z8_4), z[ 8]);

    // c24 - c14 - c04
    let z9_1 = mul_wide(aa[0], (*b).v[4]);
    let z9_2 = mul_wide(aa[1], bb[3]);
    let z9_3 = mul_wide(aa[2], bb[2]);
    let z9_4 = mul_wide(aa[3], bb[1]);
    let z9_5 = mul_wide((*a).v[4], bb[0]);
    z[ 9] = u64_sub(u64_add(u64_add(u64_add(u64_add(z9_1, z9_2), z9_3), z9_4), z9_5), z[ 9]);

    // c25 - c15 - c05mc10
    let z10_1 = mul_wide(aa[1], (*b).v[4]);
    let z10_2 = mul_wide(aa[2], bb[3]);
    let z10_3 = mul_wide(aa[3], bb[2]);
    let z10_4 = mul_wide((*a).v[4], bb[1]);
    z[10] = u64_sub(u64_add(u64_add(u64_add(z10_1, z10_2), z10_3), z10_4), z[10]);

    // c26 - c16 - c06mc11
    let z11_1 = mul_wide(aa[2], (*b).v[4]);
    let z11_2 = mul_wide(aa[3], bb[3]);
    let z11_3 = mul_wide((*a).v[4], bb[2]);
    z[11] = u64_sub(u64_add(u64_add(z11_1, z11_2), z11_3), z[11]);

    // c27 - c07mc12
    let z12_1 = mul_wide(aa[3],  (*b).v[4]);
    let z12_2 = mul_wide((*a).v[4], bb[3]);
    z[12] = u64_sub(u64_add(z12_1, z12_2), z[12]); 

    return z;
}

fn scalar29_montgomery_mul(a: ptr<function, Scalar29>, b: ptr<function, Scalar29>) -> Scalar29 {
    return scalar29_montgomery_reduce(scalar29_mul_internal(a, b));
}

fn scalar29_to_montgomery(val: ptr<function, Scalar29>) -> Scalar29 {
    var rr = Scalar29_RR;
    return scalar29_montgomery_mul(val, &rr);
}

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

@compute
@workgroup_size(128, 1, 1)
fn kernel_scalar29_mul(
    @builtin(global_invocation_id) gid: vec3<u32>,
) {
    if gid.x >= g_len {
        return;
    }

    var a = scalar29_unpack_a(gid.x, g_len);
    var b = scalar29_unpack_b(gid.x, g_len);

    var c = scalar29_mul(&a, &b);

    scalar29_pack_c(&c, gid.x, g_len);
}