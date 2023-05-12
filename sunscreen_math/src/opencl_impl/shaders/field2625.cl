#include <field2625.h.cl>

/// Carry the value from limb i = 0..8 to limb i+1
inline void carry(private u64 z[10], size_t i) {
    const u64 LOW_25_BITS = (1 << 25) - 1;
    const u64 LOW_26_BITS = (1 << 26) - 1;

    if (i % 2 == 0) {
        // Even limbs have 26 bits
        z[i + 1] += z[i] >> 26;
        z[i] &= LOW_26_BITS;
    } else {
        // Odd limbs have 25 bits
        z[i + 1] += z[i] >> 25;
        z[i] &= LOW_25_BITS;
    }
}

FieldElement2625 FieldElement2625_unpack(const global u32* ptr, const size_t grid_tid, const size_t n) {
    FieldElement2625 res;

    for (size_t i = 0; i < 10; i++) {
        res.limbs[i] = ptr[i * n + grid_tid];
    }

    return res;
}

void FieldElement2625_pack(const FieldElement2625* a, global u32* ptr, const size_t grid_tid, const size_t n) {
    for (size_t i = 0; i < 10; i++) {
        ptr[i * n + grid_tid] = a->limbs[i];
    }
}

FieldElement2625 FieldElement2625_reduce(private U64_10* val) {
    private u64* z = val->data;
    const u64 LOW_25_BITS = (1 << 25) - 1;

    // Perform two halves of the carry chain in parallel.
    carry(z, 0); carry(z, 4);
    carry(z, 1); carry(z, 5);
    carry(z, 2); carry(z, 6);
    carry(z, 3); carry(z, 7);
    // Since z[3] < 2^64, c < 2^(64-25) = 2^39,
    // so    z[4] < 2^26 + 2^39 < 2^39.0002
    carry(z, 4); carry(z, 8);
    // Now z[4] < 2^26
    // and z[5] < 2^25 + 2^13.0002 < 2^25.0004 (good enough)

    // Last carry has a multiplication by 19:
    z[0] += 19 * (z[9] >> 25);
    z[9] &= LOW_25_BITS;

    // Since z[9] < 2^64, c < 2^(64-25) = 2^39,
    //    so z[0] + 19*c < 2^26 + 2^43.248 < 2^43.249.
    carry(z, 0);
    // Now z[1] < 2^25 - 2^(43.249 - 26)
    //          < 2^25.007 (good enough)
    // and we're done.

    FieldElement2625 r = {{
        (u32)z[0],
        (u32)z[1],
        (u32)z[2],
        (u32)z[3],
        (u32)z[4],
        (u32)z[5],
        (u32)z[6],
        (u32)z[7],
        (u32)z[8],
        (u32)z[9]
    }};

    return r;
}

FieldElement2625 FieldElement2625_add(const FieldElement2625* lhs, const FieldElement2625* rhs) {
    const u32* a = lhs->limbs;
    const u32* b = rhs->limbs;

    FieldElement2625 c = {{
        a[0] + b[0],
        a[1] + b[1],
        a[2] + b[2],
        a[3] + b[3],
        a[4] + b[4],
        a[5] + b[5],
        a[6] + b[6],
        a[7] + b[7],
        a[8] + b[8],
        a[9] + b[9]
    }};

    return c;
}

FieldElement2625 FieldElement2625_sub(const FieldElement2625* lhs, const FieldElement2625* rhs) {
    const u32* a = lhs->limbs;
    const u32* b = rhs->limbs;

    U64_10 z = {{
        (u64)((a[0] + (0x3ffffed << 4)) - b[0]),
        (u64)((a[1] + (0x1ffffff << 4)) - b[1]),
        (u64)((a[2] + (0x3ffffff << 4)) - b[2]),
        (u64)((a[3] + (0x1ffffff << 4)) - b[3]),
        (u64)((a[4] + (0x3ffffff << 4)) - b[4]),
        (u64)((a[5] + (0x1ffffff << 4)) - b[5]),
        (u64)((a[6] + (0x3ffffff << 4)) - b[6]),
        (u64)((a[7] + (0x1ffffff << 4)) - b[7]),
        (u64)((a[8] + (0x3ffffff << 4)) - b[8]),
        (u64)((a[9] + (0x1ffffff << 4)) - b[9]),
    }};
    
    return FieldElement2625_reduce(&z);
}

FieldElement2625 FieldElement2625_mul(const FieldElement2625* lhs, const FieldElement2625* rhs) {
    const u32* x = lhs->limbs;
    const u32* y = rhs->limbs;

    // We assume that the input limbs x[i], y[i] are bounded by:
    //
    // x[i], y[i] < 2^(26 + b) if i even
    // x[i], y[i] < 2^(25 + b) if i odd
    //
    // where b is a (real) parameter representing the excess bits of
    // the limbs.  We track the bitsizes of all variables through
    // the computation and solve at the end for the allowable
    // headroom bitsize b (which determines how many additions we
    // can perform between reductions or multiplications).

    u32 y1_19 = 19 * y[1]; // This fits in a u32
    u32 y2_19 = 19 * y[2]; // iff 26 + b + lg(19) < 32
    u32 y3_19 = 19 * y[3]; // if  b < 32 - 26 - 4.248 = 1.752
    u32 y4_19 = 19 * y[4];
    u32 y5_19 = 19 * y[5]; // below, b<2.5: this is a bottleneck,
    u32 y6_19 = 19 * y[6]; // could be avoided by promoting to
    u32 y7_19 = 19 * y[7]; // u64 here instead of in m()
    u32 y8_19 = 19 * y[8];
    u32 y9_19 = 19 * y[9];

    // What happens when we multiply x[i] with y[j] and place the
    // result into the (i+j)-th limb?
    //
    // x[i]      represents the value x[i]*2^ceil(i*51/2)
    // y[j]      represents the value y[j]*2^ceil(j*51/2)
    // z[i+j]    represents the value z[i+j]*2^ceil((i+j)*51/2)
    // x[i]*y[j] represents the value x[i]*y[i]*2^(ceil(i*51/2)+ceil(j*51/2))
    //
    // Since the radix is already accounted for, the result placed
    // into the (i+j)-th limb should be
    //
    // x[i]*y[i]*2^(ceil(i*51/2)+ceil(j*51/2) - ceil((i+j)*51/2)).
    //
    // The value of ceil(i*51/2)+ceil(j*51/2) - ceil((i+j)*51/2) is
    // 1 when both i and j are odd, and 0 otherwise.  So we add
    //
    //   x[i]*y[j] if either i or j is even
    // 2*x[i]*y[j] if i and j are both odd
    //
    // by using precomputed multiples of x[i] for odd i:

    u32 x1_2 = 2 * x[1]; // This fits in a u32 iff 25 + b + 1 < 32
    u32 x3_2 = 2 * x[3]; //                    iff b < 6
    u32 x5_2 = 2 * x[5];
    u32 x7_2 = 2 * x[7];
    u32 x9_2 = 2 * x[9];

    u64 z0 = m(x[0], y[0]) + m(x1_2, y9_19) + m(x[2], y8_19) + m(x3_2, y7_19) + m(x[4], y6_19) + m(x5_2, y5_19) + m(x[6], y4_19) + m(x7_2, y3_19) + m(x[8], y2_19) + m(x9_2, y1_19);
    u64 z1 = m(x[0], y[1]) + m(x[1],  y[0]) + m(x[2], y9_19) + m(x[3], y8_19) + m(x[4], y7_19) + m(x[5], y6_19) + m(x[6], y5_19) + m(x[7], y4_19) + m(x[8], y3_19) + m(x[9], y2_19);
    u64 z2 = m(x[0], y[2]) + m(x1_2,  y[1]) + m(x[2], y[0])  + m(x3_2, y9_19) + m(x[4], y8_19) + m(x5_2, y7_19) + m(x[6], y6_19) + m(x7_2, y5_19) + m(x[8], y4_19) + m(x9_2, y3_19);
    u64 z3 = m(x[0], y[3]) + m(x[1],  y[2]) + m(x[2], y[1])  + m(x[3],  y[0]) + m(x[4], y9_19) + m(x[5], y8_19) + m(x[6], y7_19) + m(x[7], y6_19) + m(x[8], y5_19) + m(x[9], y4_19);
    u64 z4 = m(x[0], y[4]) + m(x1_2,  y[3]) + m(x[2], y[2])  + m(x3_2,  y[1]) + m(x[4],  y[0]) + m(x5_2, y9_19) + m(x[6], y8_19) + m(x7_2, y7_19) + m(x[8], y6_19) + m(x9_2, y5_19);
    u64 z5 = m(x[0], y[5]) + m(x[1],  y[4]) + m(x[2], y[3])  + m(x[3],  y[2]) + m(x[4],  y[1]) + m(x[5],  y[0]) + m(x[6], y9_19) + m(x[7], y8_19) + m(x[8], y7_19) + m(x[9], y6_19);
    u64 z6 = m(x[0], y[6]) + m(x1_2,  y[5]) + m(x[2], y[4])  + m(x3_2,  y[3]) + m(x[4],  y[2]) + m(x5_2,  y[1]) + m(x[6],  y[0]) + m(x7_2, y9_19) + m(x[8], y8_19) + m(x9_2, y7_19);
    u64 z7 = m(x[0], y[7]) + m(x[1],  y[6]) + m(x[2], y[5])  + m(x[3],  y[4]) + m(x[4],  y[3]) + m(x[5],  y[2]) + m(x[6],  y[1]) + m(x[7],  y[0]) + m(x[8], y9_19) + m(x[9], y8_19);
    u64 z8 = m(x[0], y[8]) + m(x1_2,  y[7]) + m(x[2], y[6])  + m(x3_2,  y[5]) + m(x[4],  y[4]) + m(x5_2,  y[3]) + m(x[6],  y[2]) + m(x7_2,  y[1]) + m(x[8],  y[0]) + m(x9_2, y9_19);
    u64 z9 = m(x[0], y[9]) + m(x[1],  y[8]) + m(x[2], y[7])  + m(x[3],  y[6]) + m(x[4],  y[5]) + m(x[5],  y[4]) + m(x[6],  y[3]) + m(x[7],  y[2]) + m(x[8],  y[1]) + m(x[9],  y[0]);

    // How big is the contribution to z[i+j] from x[i], y[j]?
    //
    // Using the bounds above, we get:
    //
    // i even, j even:   x[i]*y[j] <   2^(26+b)*2^(26+b) = 2*2^(51+2*b)
    // i  odd, j even:   x[i]*y[j] <   2^(25+b)*2^(26+b) = 1*2^(51+2*b)
    // i even, j  odd:   x[i]*y[j] <   2^(26+b)*2^(25+b) = 1*2^(51+2*b)
    // i  odd, j  odd: 2*x[i]*y[j] < 2*2^(25+b)*2^(25+b) = 1*2^(51+2*b)
    //
    // We perform inline reduction mod p by replacing 2^255 by 19
    // (since 2^255 - 19 = 0 mod p).  This adds a factor of 19, so
    // we get the bounds (z0 is the biggest one, but calculated for
    // posterity here in case finer estimation is needed later):
    //
    //  z0 < ( 2 + 1*19 + 2*19 + 1*19 + 2*19 + 1*19 + 2*19 + 1*19 + 2*19 + 1*19 )*2^(51 + 2b) = 249*2^(51 + 2*b)
    //  z1 < ( 1 +  1   + 1*19 + 1*19 + 1*19 + 1*19 + 1*19 + 1*19 + 1*19 + 1*19 )*2^(51 + 2b) = 154*2^(51 + 2*b)
    //  z2 < ( 2 +  1   +  2   + 1*19 + 2*19 + 1*19 + 2*19 + 1*19 + 2*19 + 1*19 )*2^(51 + 2b) = 195*2^(51 + 2*b)
    //  z3 < ( 1 +  1   +  1   +  1   + 1*19 + 1*19 + 1*19 + 1*19 + 1*19 + 1*19 )*2^(51 + 2b) = 118*2^(51 + 2*b)
    //  z4 < ( 2 +  1   +  2   +  1   +  2   + 1*19 + 2*19 + 1*19 + 2*19 + 1*19 )*2^(51 + 2b) = 141*2^(51 + 2*b)
    //  z5 < ( 1 +  1   +  1   +  1   +  1   +  1   + 1*19 + 1*19 + 1*19 + 1*19 )*2^(51 + 2b) =  82*2^(51 + 2*b)
    //  z6 < ( 2 +  1   +  2   +  1   +  2   +  1   +  2   + 1*19 + 2*19 + 1*19 )*2^(51 + 2b) =  87*2^(51 + 2*b)
    //  z7 < ( 1 +  1   +  1   +  1   +  1   +  1   +  1   +  1   + 1*19 + 1*19 )*2^(51 + 2b) =  46*2^(51 + 2*b)
    //  z6 < ( 2 +  1   +  2   +  1   +  2   +  1   +  2   +  1   +  2   + 1*19 )*2^(51 + 2b) =  33*2^(51 + 2*b)
    //  z7 < ( 1 +  1   +  1   +  1   +  1   +  1   +  1   +  1   +  1   +  1   )*2^(51 + 2b) =  10*2^(51 + 2*b)
    //
    // So z[0] fits into a u64 if 51 + 2*b + lg(249) < 64
    //                         if b < 2.5.
    U64_10 z = {{z0, z1, z2, z3, z4, z5, z6, z7, z8, z9}};

    return FieldElement2625_reduce(&z);
}

U64_10 FieldElement2625_square_inner(const FieldElement2625* val) {
    // Optimized version of multiplication for the case of squaring.
    // Pre- and post- conditions identical to multiplication function.
    const u32* x = val->limbs;
    u32 x0_2  =  2 * x[0];
    u32 x1_2  =  2 * x[1];
    u32 x2_2  =  2 * x[2];
    u32 x3_2  =  2 * x[3];
    u32 x4_2  =  2 * x[4];
    u32 x5_2  =  2 * x[5];
    u32 x6_2  =  2 * x[6];
    u32 x7_2  =  2 * x[7];
    u32 x5_19 = 19 * x[5];
    u32 x6_19 = 19 * x[6];
    u32 x7_19 = 19 * x[7];
    u32 x8_19 = 19 * x[8];
    u32 x9_19 = 19 * x[9];

    // This block is rearranged so that instead of doing a 32-bit multiplication by 38, we do a
    // 64-bit multiplication by 2 on the results.  This is because lg(38) is too big: we would
    // have less than 1 bit of headroom left, which is too little.
    U64_10 c;
    u64* z = c.data;

    z[0] = m(x[0], x[0]) + m(x2_2, x8_19) + m(x4_2, x6_19) + (m(x1_2, x9_19) +  m(x3_2, x7_19) + m(x[5], x5_19)) * 2;
    z[1] = m(x0_2, x[1]) + m(x3_2, x8_19) + m(x5_2, x6_19) + (m(x[2], x9_19) +  m(x[4], x7_19)                 ) * 2;
    z[2] = m(x0_2, x[2]) + m(x1_2,  x[1]) + m(x4_2, x8_19) +  m(x[6], x6_19) + (m(x3_2, x9_19) + m(x5_2, x7_19)) * 2;
    z[3] = m(x0_2, x[3]) + m(x1_2,  x[2]) + m(x5_2, x8_19) + (m(x[4], x9_19) +  m(x[6], x7_19)                 ) * 2;
    z[4] = m(x0_2, x[4]) + m(x1_2,  x3_2) + m(x[2],  x[2]) +  m(x6_2, x8_19) + (m(x5_2, x9_19) + m(x[7], x7_19)) * 2;
    z[5] = m(x0_2, x[5]) + m(x1_2,  x[4]) + m(x2_2,  x[3]) +  m(x7_2, x8_19) +  m(x[6], x9_19)                   * 2;
    z[6] = m(x0_2, x[6]) + m(x1_2,  x5_2) + m(x2_2,  x[4]) +  m(x3_2,  x[3]) +  m(x[8], x8_19) + m(x7_2, x9_19)  * 2;
    z[7] = m(x0_2, x[7]) + m(x1_2,  x[6]) + m(x2_2,  x[5]) +  m(x3_2,  x[4]) +  m(x[8], x9_19)                   * 2;
    z[8] = m(x0_2, x[8]) + m(x1_2,  x7_2) + m(x2_2,  x[6]) +  m(x3_2,  x5_2) +  m(x[4],  x[4]) + m(x[9], x9_19)  * 2;
    z[9] = m(x0_2, x[9]) + m(x1_2,  x[8]) + m(x2_2,  x[7]) +  m(x3_2,  x[6]) +  m(x4_2,  x[5])                      ;

    return c;
}

FieldElement2625 FieldElement2625_square(const FieldElement2625* val) {
    U64_10 z = FieldElement2625_square_inner(val);
    return FieldElement2625_reduce(&z);
}

FieldElement2625 FieldElement2625_square2(const FieldElement2625* val) {
    U64_10 sq = FieldElement2625_square_inner(val);

    for (int i = 0; i < 10; i++) {
        sq.data[i] += sq.data[i];
    }

    return FieldElement2625_reduce(&sq);
}

FieldElement2625 FieldElement2625_neg(const FieldElement2625* lhs) {
    const u32* self = lhs->limbs;

    // Compute -b as ((2^4 * p) - b) to avoid underflow.
    U64_10 limbs = {{
        (u64)((0x3ffffed << 4) - self[0]),
        (u64)((0x1ffffff << 4) - self[1]),
        (u64)((0x3ffffff << 4) - self[2]),
        (u64)((0x1ffffff << 4) - self[3]),
        (u64)((0x3ffffff << 4) - self[4]),
        (u64)((0x1ffffff << 4) - self[5]),
        (u64)((0x3ffffff << 4) - self[6]),
        (u64)((0x1ffffff << 4) - self[7]),
        (u64)((0x3ffffff << 4) - self[8]),
        (u64)((0x1ffffff << 4) - self[9]),
    }};

    return FieldElement2625_reduce(&limbs);
}
