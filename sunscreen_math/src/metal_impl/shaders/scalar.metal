#include <metal_integer>

#include <inttypes.hpp.metal>
#include <constants.hpp.metal>
#include <scalar.hpp.metal>

Scalar29 Scalar29::unpack(device const u32* words, size_t grid_tid, size_t stride) {
    words = &words[grid_tid];
    const u32 mask = (1 << 29) - 1;
    const u32 top_mask = (1 << 24) - 1;
    Scalar29 s = Scalar29::Zero;

    s[0] =   words[0 * stride]                                     & mask;
    s[1] = ((words[0 * stride] >> 29) | (words[1 * stride] <<  3)) & mask;
    s[2] = ((words[1 * stride] >> 26) | (words[2 * stride] <<  6)) & mask;
    s[3] = ((words[2 * stride] >> 23) | (words[3 * stride] <<  9)) & mask;
    s[4] = ((words[3 * stride] >> 20) | (words[4 * stride] << 12)) & mask;
    s[5] = ((words[4 * stride] >> 17) | (words[5 * stride] << 15)) & mask;
    s[6] = ((words[5 * stride] >> 14) | (words[6 * stride] << 18)) & mask;
    s[7] = ((words[6 * stride] >> 11) | (words[7 * stride] << 21)) & mask;
    s[8] =  (words[7 * stride] >>  8)                              & top_mask;

    return s;
}

void Scalar29::pack(device u32* words, size_t grid_tid, size_t stride) {
    words = &words[grid_tid];
    
    u32 word = _limbs[0] | _limbs[1] << 29;
    words[0 * stride] = word;
    word = _limbs[1] >> 3 | _limbs[2] << 26;
    words[1 * stride] = word;
    word = _limbs[2] >> 6 | _limbs[3] << 23;
    words[2 * stride] = word;
    word = _limbs[3] >> 9 | _limbs[4] << 20;
    words[3 * stride] = word;
    word = _limbs[4] >> 12 | _limbs[5] << 17;
    words[4 * stride] = word;
    word = _limbs[5] >> 15 | _limbs[6] << 14;
    words[5 * stride] = word;
    word = _limbs[6] >> 18 | _limbs[7] << 11;
    words[6 * stride] = word;
    word = _limbs[7] >> 21 | _limbs[8] << 8;
    words[7 * stride] = word;
}

Scalar29 Scalar29::add(const Scalar29 a, const Scalar29 b) {
    auto sum = Scalar29::Zero;
    const u32 mask = (0x1 << 29) - 1;

    // a + b
    u32 carry = 0;
    for (size_t i = 0; i < 9; i++) {
        carry = a[i] + b[i] + (carry >> 29);
        sum[i] = carry & mask;
    }

    // subtract l if the sum is >= l
    return Scalar29::sub(sum, constants::L);
}

Scalar29 Scalar29::sub(const Scalar29 a, const Scalar29 b) {
    auto difference = Scalar29::Zero;
    const u32 mask = (1 << 29) - 1;

    // a - b
    u32 borrow = 0;
    for (size_t i = 0; i < 9; i++) {
        borrow = a[i] - (b[i] + (borrow >> 31));
        difference[i] = borrow & mask;
    }

    // conditionally add l if the difference is negative
    const u32 underflow_mask = ((borrow >> 31) ^ 1) - 1;

    u32 carry = 0;
    for (size_t i = 0; i < 9; i++) {
        carry = (carry >> 29) + difference[i] + (constants::L[i] & underflow_mask);
        difference[i] = carry & mask;
    }

    return difference;
}

struct MulResult {
    ulong limbs[17];

    thread const u64& operator[](const size_t i) const {
        return limbs[i];
    }

    thread u64& operator[](const size_t i) {
        return limbs[i];
    }
};

MulResult square_internal(Scalar29 a);
MulResult mul_internal(Scalar29 a, Scalar29 b);
Scalar29 montgomery_reduce(MulResult limbs);

Scalar29 Scalar29::mul(Scalar29 a, Scalar29 b) {
    Scalar29 ab = montgomery_reduce(mul_internal(a, b));

    Scalar29 rr = constants::RR;
    return montgomery_reduce(mul_internal(ab, rr));
}

Scalar29 Scalar29::square(Scalar29 a) {
    Scalar29 aa = montgomery_reduce(square_internal(a));

    Scalar29 rr = constants::RR;
    return montgomery_reduce(mul_internal(aa, rr));
}

u64 m(u32 a, u32 b) {
    u64 c;

    c = ((u64)(a * b)) | ((u64)metal::mulhi(a, b)) << 32;

    return c;
}

MulResult mul_internal(Scalar29 a, Scalar29 b) {
    MulResult z;

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
}

MulResult square_internal(Scalar29 a) {
        u32 aa[8] = {
            a[0] * 2,
            a[1] * 2,
            a[2] * 2,
            a[3] * 2,
            a[4] * 2,
            a[5] * 2,
            a[6] * 2,
            a[7] * 2
        };

        MulResult r = {
            m( a[0], a[0]),
            m(aa[0], a[1]),
            m(aa[0], a[2]) + m( a[1], a[1]),
            m(aa[0], a[3]) + m(aa[1], a[2]),
            m(aa[0], a[4]) + m(aa[1], a[3]) + m( a[2], a[2]),
            m(aa[0], a[5]) + m(aa[1], a[4]) + m(aa[2], a[3]),
            m(aa[0], a[6]) + m(aa[1], a[5]) + m(aa[2], a[4]) + m( a[3], a[3]),
            m(aa[0], a[7]) + m(aa[1], a[6]) + m(aa[2], a[5]) + m(aa[3], a[4]),
            m(aa[0], a[8]) + m(aa[1], a[7]) + m(aa[2], a[6]) + m(aa[3], a[5]) + m( a[4], a[4]),
                             m(aa[1], a[8]) + m(aa[2], a[7]) + m(aa[3], a[6]) + m(aa[4], a[5]),
                                              m(aa[2], a[8]) + m(aa[3], a[7]) + m(aa[4], a[6]) + m( a[5], a[5]),
                                                               m(aa[3], a[8]) + m(aa[4], a[7]) + m(aa[5], a[6]),
                                                                                m(aa[4], a[8]) + m(aa[5], a[7]) + m( a[6], a[6]),
                                                                                                 m(aa[5], a[8]) + m(aa[6], a[7]),
                                                                                                                  m(aa[6], a[8]) + m( a[7], a[7]),
                                                                                                                                   m(aa[7], a[8]),
                                                                                                                                                    m( a[8], a[8]),
        };

        return r;
    }

struct MontMulLRes {
        u64 carry;
        u32 n;

        MontMulLRes(u64 carry, u32 n): carry(carry), n(n) {}
};

inline MontMulLRes part1(u64 sum) {
    u32 p = ((u32)sum) * (constants::LFACTOR) & ((1u << 29) - 1);
    return MontMulLRes((sum + m(p,constants::L[0])) >> 29, p);
}

inline MontMulLRes part2(u64 sum) {
    u32 w = ((u32)sum) & ((1u << 29) - 1);
    return MontMulLRes(sum >> 29, w);
}

Scalar29 montgomery_reduce(MulResult limbs) {
    // note: l5,l6,l7 are zero, so their multiplies can be skipped
    Scalar29 l = constants::L;

    // the first half computes the Montgomery adjustment factor n, and begins adding n*l to make limbs divisible by R
    MontMulLRes x0 = part1(        limbs[ 0]);
    MontMulLRes x1 = part1(x0.carry + limbs[ 1] + m(x0.n,l[1]));
    MontMulLRes x2 = part1(x1.carry + limbs[ 2] + m(x0.n,l[2]) + m(x1.n,l[1]));
    MontMulLRes x3 = part1(x2.carry + limbs[ 3] + m(x0.n,l[3]) + m(x1.n,l[2]) + m(x2.n,l[1]));
    MontMulLRes x4 = part1(x3.carry + limbs[ 4] + m(x0.n,l[4]) + m(x1.n,l[3]) + m(x2.n,l[2]) + m(x3.n,l[1]));
    MontMulLRes x5 = part1(x4.carry + limbs[ 5]                + m(x1.n,l[4]) + m(x2.n,l[3]) + m(x3.n,l[2]) + m(x4.n,l[1]));
    MontMulLRes x6 = part1(x5.carry + limbs[ 6]                               + m(x2.n,l[4]) + m(x3.n,l[3]) + m(x4.n,l[2]) + m(x5.n,l[1]));
    MontMulLRes x7 = part1(x6.carry + limbs[ 7]                                              + m(x3.n,l[4]) + m(x4.n,l[3]) + m(x5.n,l[2]) + m(x6.n,l[1]));
    MontMulLRes x8 = part1(x7.carry + limbs[ 8] + m(x0.n,l[8])                                              + m(x4.n,l[4]) + m(x5.n,l[3]) + m(x6.n,l[2]) + m(x7.n,l[1]));

    // limbs is divisible by R now, so we can divide by R by simply storing the upper half as the result
    MontMulLRes r0 = part2(x8.carry + limbs[ 9]                + m(x1.n,l[8])                                              + m(x5.n,l[4]) + m(x6.n,l[3]) + m(x7.n,l[2]) + m(x8.n,l[1]));
    MontMulLRes r1 = part2(r0.carry + limbs[10]                               + m(x2.n,l[8])                                              + m(x6.n,l[4]) + m(x7.n,l[3]) + m(x8.n,l[2]));
    MontMulLRes r2 = part2(r1.carry + limbs[11]                                              + m(x3.n,l[8])                                              + m(x7.n,l[4]) + m(x8.n,l[3]));
    MontMulLRes r3 = part2(r2.carry + limbs[12]                                                             + m(x4.n,l[8])                                              + m(x8.n,l[4]));
    MontMulLRes r4 = part2(r3.carry + limbs[13]                                                                            + m(x5.n,l[8]));
    MontMulLRes r5 = part2(r4.carry + limbs[14]                                                                                           + m(x6.n,l[8]));
    MontMulLRes r6 = part2(r5.carry + limbs[15]                                                                                                          + m(x7.n,l[8]));
    MontMulLRes r7 = part2(r6.carry + limbs[16]                                                                                                                         + m(x8.n,l[8]));
    u32 r8 = (u32)r7.carry;

    u32 vals[9] = {r0.n,r1.n,r2.n,r3.n,r4.n,r5.n,r6.n,r7.n,r8};

    // result may be >= l, so attempt to subtract l
    return Scalar29(vals) - l;
}

constant u32 data[] = {0, 0, 0, 0, 0, 0, 0, 0, 0};

constant Scalar29 Scalar29::Zero(data);

kernel void scalar_add(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device const u32* b [[buffer(1)]],
    device u32* c [[buffer(2)]],
    constant u32& len [[buffer(3)]]
) {
    Scalar29 t_a = Scalar29::unpack(a, tid, len);
    Scalar29 t_b = Scalar29::unpack(b, tid, len);

    (t_a + t_b).pack(c, tid, len);
}

kernel void scalar_sub(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device const u32* b [[buffer(1)]],
    device u32* c [[buffer(2)]],
    constant u32& len [[buffer(3)]]
) {
    Scalar29 t_a = Scalar29::unpack(a, tid, len);
    Scalar29 t_b = Scalar29::unpack(b, tid, len);

    (t_a - t_b).pack(c, tid, len);
}

kernel void scalar_neg(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    constant u32& len [[buffer(2)]]
) {
    Scalar29 t_a = Scalar29::unpack(a, tid, len);
    Scalar29 zero = Scalar29::Zero;

    (zero - t_a).pack(b, tid, len);
}

kernel void scalar_mul(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device const u32* b [[buffer(1)]],
    device u32* c [[buffer(2)]],
    constant u32& len [[buffer(3)]]
) {
    Scalar29 t_a = Scalar29::unpack(a, tid, len);
    Scalar29 t_b = Scalar29::unpack(b, tid, len);

    (t_a * t_b).pack(c, tid, len);
}

kernel void scalar_square(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    constant u32& len [[buffer(2)]]
) {
    Scalar29 t_a = Scalar29::unpack(a, tid, len);

    t_a.square().pack(b, tid, len);
}

//
// Test kernels
// TODO: #ifdef these away for production
//
kernel void test_get_l(
    device u32* a [[buffer(0)]]
 ) {
    Scalar29 l = constants::L;

    l.pack(a, 0, 1);
}

kernel void test_can_pack_unpack_scalar(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    constant u32& len [[buffer(2)]]
) {
    auto x = Scalar29::unpack(a, tid, len);
    x.pack(b, tid, len);
}