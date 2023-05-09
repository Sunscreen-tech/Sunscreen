#include <constants.h.cl>
#include <scalar29.h.cl>

inline MontMulLRes part1(u64 sum) {
    u32 p = ((u32)sum) * (0x12547e1b) & ((1u << 29) - 1);

    MontMulLRes c;
    c.carry = (sum + m(p,Scalar29_L.limbs[0])) >> 29;
    c.n = p; 
    return c;
}

inline MontMulLRes part2(u64 sum) {
    u32 w = ((u32)sum) & ((1u << 29) - 1);

    MontMulLRes c;
    c.carry = sum >> 29;
    c.n = w;

    return c;
}

Scalar29 Scalar29_unpack(const global u32* words, size_t grid_tid, size_t stride) {
    words = &words[grid_tid];
    const u32 mask = (1 << 29) - 1;
    const u32 top_mask = (1 << 24) - 1;
    Scalar29 r = Scalar29_Zero;
    u32* s = r.limbs;

    s[0] =   words[0 * stride]                                     & mask;
    s[1] = ((words[0 * stride] >> 29) | (words[1 * stride] <<  3)) & mask;
    s[2] = ((words[1 * stride] >> 26) | (words[2 * stride] <<  6)) & mask;
    s[3] = ((words[2 * stride] >> 23) | (words[3 * stride] <<  9)) & mask;
    s[4] = ((words[3 * stride] >> 20) | (words[4 * stride] << 12)) & mask;
    s[5] = ((words[4 * stride] >> 17) | (words[5 * stride] << 15)) & mask;
    s[6] = ((words[5 * stride] >> 14) | (words[6 * stride] << 18)) & mask;
    s[7] = ((words[6 * stride] >> 11) | (words[7 * stride] << 21)) & mask;
    s[8] =  (words[7 * stride] >>  8)                              & top_mask;

    return r;
}

void Scalar29_pack(const Scalar29* this, global u32* words, size_t grid_tid, size_t stride) {
    words = &words[grid_tid];
    const u32* _limbs = this->limbs;

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

Scalar29 Scalar29_add(const Scalar29* lhs, const Scalar29* rhs) {
    Scalar29 c = Scalar29_Zero;
    const u32 mask = (0x1 << 29) - 1;
    const u32* a = lhs->limbs;
    const u32* b = rhs->limbs;
    u32* sum = c.limbs;

    // a + b
    u32 carry = 0;
    for (size_t i = 0; i < 9; i++) {
        carry = a[i] + b[i] + (carry >> 29);
        sum[i] = carry & mask;
    }

    Scalar29 l = Scalar29_L;

    // subtract l if the sum is >= l
    return Scalar29_sub(&c, &l);
}

Scalar29 Scalar29_sub(const Scalar29* lhs, const Scalar29* rhs) {
    Scalar29 c = Scalar29_Zero;
    const u32 mask = (1 << 29) - 1;
    const Scalar29 ell = Scalar29_L;

    const u32* a = lhs->limbs;
    const u32* b = rhs->limbs;
    const u32* l = ell.limbs;
    u32* difference = c.limbs;

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
        carry = (carry >> 29) + difference[i] + (l[i] & underflow_mask);
        difference[i] = carry & mask;
    }

    return c;
}

Scalar29 Scalar29_mul(const Scalar29* a, const Scalar29* b) {
    MulResult c = Scalar29_mul_internal(a, b);
    Scalar29 ab = Scalar29_montgomery_reduce(&c);

    Scalar29 rr = Scalar29_RR;
    c = Scalar29_mul_internal(&ab, &rr);
    return Scalar29_montgomery_reduce(&c);
}

MulResult Scalar29_mul_internal(const Scalar29* lhs, const Scalar29* rhs) {
    MulResult res;

    const u32* a = lhs->limbs;
    const u32* b = rhs->limbs;
    u64* z = res.limbs;

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

    return res;
}

MulResult Scalar29_square_internal(const Scalar29* lhs) {
    const u32* a = lhs->limbs;

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

    MulResult r = {{
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
    }};

    return r;
}

Scalar29 Scalar29_montgomery_reduce(MulResult* a) {
    u64* limbs = a->limbs;

    // note: l5,l6,l7 are zero, so their multiplies can be skipped
    Scalar29 ell = Scalar29_L;
    const u32* l = ell.limbs;

    // the first half computes the Montgomery adjustment factor n, and begins adding n*l to make limbs divisible by R
    MontMulLRes x0 = part1(           limbs[ 0]);
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

    Scalar29 c = {{r0.n,r1.n,r2.n,r3.n,r4.n,r5.n,r6.n,r7.n,r8}};

    Scalar29 result = Scalar29_sub(&c, &ell);

    // result may be >= l, so attempt to subtract l
    return result;
}

Scalar29 Scalar29_montgomery_square(const Scalar29* x) {
    MulResult y = Scalar29_square_internal(x);
    return Scalar29_montgomery_reduce(&y);
}

Scalar29 Scalar29_montgomery_mul(const Scalar29* a, const Scalar29* b) {
    MulResult y = Scalar29_mul_internal(a, b);
    return Scalar29_montgomery_reduce(&y);
}

void Scalar29_square_multiply(volatile Scalar29* y, int squarings, const Scalar29* x) {
    for (int i = 0; i < squarings; i++) {
        *y = Scalar29_montgomery_square((Scalar29*)y);
    }
    *y = Scalar29_montgomery_mul((Scalar29*)y, x);
}

Scalar29 Scalar29_montgomery_invert(const Scalar29* this) {
    // Uses the addition chain from
    // https://briansmith.org/ecc-inversion-addition-chains-01#curve25519_scalar_inversion
    const Scalar29*   _1 = this;
    Scalar29   _10 = Scalar29_montgomery_square(_1);
    Scalar29  _100 = Scalar29_montgomery_square(&_10);
    Scalar29   _11 = Scalar29_montgomery_mul(&_10,     _1);
    Scalar29  _101 = Scalar29_montgomery_mul(&_10,    &_11);
    Scalar29  _111 = Scalar29_montgomery_mul(&_10,   &_101);
    Scalar29 _1001 = Scalar29_montgomery_mul(&_10,   &_111);
    Scalar29 _1011 = Scalar29_montgomery_mul(&_10,  &_1001);
    Scalar29 _1111 = Scalar29_montgomery_mul(&_100, &_1011);

    // _10000
    Scalar29 y = Scalar29_montgomery_mul(&_1111, _1);

    Scalar29_square_multiply(&y, 123 + 3, &_101);
    Scalar29_square_multiply(&y,   2 + 2, &_11);
    Scalar29_square_multiply(&y,   1 + 4, &_1111);
    Scalar29_square_multiply(&y,   1 + 4, &_1111);
    Scalar29_square_multiply(&y,       4, &_1001);
    Scalar29_square_multiply(&y,       2, &_11);
    Scalar29_square_multiply(&y,   1 + 4, &_1111);
    Scalar29_square_multiply(&y,   1 + 3, &_101);
    Scalar29_square_multiply(&y,   3 + 3, &_101);
    Scalar29_square_multiply(&y,       3, &_111);
    Scalar29_square_multiply(&y,   1 + 4, &_1111);
    Scalar29_square_multiply(&y,   2 + 3, &_111);
    Scalar29_square_multiply(&y,   2 + 2, &_11);
    Scalar29_square_multiply(&y,   1 + 4, &_1011);
    Scalar29_square_multiply(&y,   2 + 4, &_1011);
    Scalar29_square_multiply(&y,   6 + 4, &_1001);
    Scalar29_square_multiply(&y,   2 + 2, &_11);
    Scalar29_square_multiply(&y,   3 + 2, &_11);
    Scalar29_square_multiply(&y,   3 + 2, &_11);
    Scalar29_square_multiply(&y,   1 + 4, &_1001);
    Scalar29_square_multiply(&y,   1 + 3, &_111);
    Scalar29_square_multiply(&y,   2 + 4, &_1111);
    Scalar29_square_multiply(&y,   1 + 4, &_1011);
    Scalar29_square_multiply(&y,       3, &_101);
    Scalar29_square_multiply(&y,   2 + 4, &_1111);
    Scalar29_square_multiply(&y,       3, &_101);
    Scalar29_square_multiply(&y,   1 + 2, &_11);

    return y;
}

Scalar29 Scalar29_to_montgomery(const Scalar29* val) {
    Scalar29 rr = Scalar29_RR;
    return Scalar29_montgomery_mul(val, &rr);
}

Scalar29 Scalar29_from_montgomery(const Scalar29* val) {
    MulResult z = {{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}};
    for (size_t i = 0; i < 9; i++) {
        z.limbs[i] = (u64)val->limbs[i];
    }
            
    return Scalar29_montgomery_reduce(&z);
}

Scalar29 Scalar29_invert(const Scalar29* this) {
    Scalar29 mont = Scalar29_to_montgomery(this);
    Scalar29 mont_inv = Scalar29_montgomery_invert(&mont);
    return Scalar29_from_montgomery(&mont_inv);
}

Scalar29 Scalar29_square(const Scalar29* val) {
    MulResult sq_mont = Scalar29_square_internal(val);
    Scalar29 aa = Scalar29_montgomery_reduce(&sq_mont);

    Scalar29 rr = Scalar29_RR;
    MulResult aa_rr = Scalar29_mul_internal(&aa, &rr);
    return Scalar29_montgomery_reduce(&aa_rr);
}

Radix16 Scalar29_as_radix_16(const Scalar29* this) {
    Radix16 res;
    i8* output = res.data;
    
    const u32* self = this->limbs;

    u32 words[8] = { 0, 0, 0, 0, 0, 0, 0, 0 };
    // Convert Scalar29 to Scalar
    u32 word = self[0] | self[1] << 29;
    words[0] = word;
    word = self[1] >> 3 | self[2] << 26;
    words[1] = word;
    word = self[2] >> 6 | self[3] << 23;
    words[2] = word;
    word = self[3] >> 9 | self[4] << 20;
    words[3] = word;
    word = self[4] >> 12 | self[5] << 17;
    words[4] = word;
    word = self[5] >> 15 | self[6] << 14;
    words[5] = word;
    word = self[6] >> 18 | self[7] << 11;
    words[6] = word;
    word = self[7] >> 21 | self[8] << 8;
    words[7] = word;

    for (size_t i = 0; i < 8; i++) {
        u32 word = words[i];

        output[8 * i + 0] = (word >> 0) & 0xF;
        output[8 * i + 1] = (word >> 4) & 0xF;
        output[8 * i + 2] = (word >> 8) & 0xF;
        output[8 * i + 3] = (word >> 12) & 0xF;
        output[8 * i + 4] = (word >> 16) & 0xF;
        output[8 * i + 5] = (word >> 20) & 0xF;
        output[8 * i + 6] = (word >> 24) & 0xF;
        output[8 * i + 7] = (word >> 28) & 0xF;
    }

    // Step 2: recenter coefficients from [0,16) to [-8,8)
    for (size_t i = 0; i < 63; i++) {
        i8 carry = (output[i] + 8) >> 4;
        output[i] -= (carry << 4);
        output[i + 1] += carry;
    }

    return res;
}

kernel void scalar_add(
    global const u32* a,
    global const u32* b,
    global u32* c,
    const u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);
        Scalar29 t_b = Scalar29_unpack(b, tid, len);

        Scalar29 t_c = Scalar29_add(&t_a, &t_b);
        Scalar29_pack(&t_c, c, tid, len);
    }
}

kernel void scalar_sub(
    global const u32* a,
    global const u32* b,
    global u32* c,
    u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);
        Scalar29 t_b = Scalar29_unpack(b, tid, len);

        Scalar29 t_c = Scalar29_sub(&t_a, &t_b);

        Scalar29_pack(&t_c, c, tid, len);
    }
}

kernel void scalar_neg(
    global const u32* a,
    global u32* b,
    u32 len 
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);
        Scalar29 zero = Scalar29_Zero;

        Scalar29 t_c = Scalar29_sub(&zero, &t_a);
        Scalar29_pack(&t_c, b, tid, len);
    }
}

kernel void scalar_mul(
    global const u32* a,
    global const u32* b,
    global u32* c ,
    u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);
        Scalar29 t_b = Scalar29_unpack(b, tid, len);

        Scalar29 t_c = Scalar29_mul(&t_a, &t_b);

        Scalar29_pack(&t_c, c, tid, len);
    }
}

kernel void scalar_invert(
    global const u32* a,
    global u32* b,
    u32 len 
) {
    u32 tid = get_global_id(0);
    
    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);

        Scalar29 t_a_inv = Scalar29_invert(&t_a);
        Scalar29_pack(&t_a_inv, b, tid, len);
    }
}

kernel void scalar_square(
    global const u32* a,
    global u32* b,
    u32 len 
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);
        Scalar29 t_a_sq = Scalar29_square(&t_a);

        Scalar29_pack(&t_a_sq, b, tid, len);
    }
}
