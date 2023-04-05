// A transliteration of the OpenCL shaders
#if defined(CUDA_C)

///
/// Types
///
typedef unsigned int u32;
typedef unsigned long u64;
typedef char i8;
typedef unsigned char u8;
typedef short i16;

struct Scalar29 {
    u32 limbs[10];
};

struct MulResult {
    ulong limbs[17];
};

struct MontMulLRes {
    u64 carry;
    u32 n;
};

struct FieldElement2625 {
    u32 limbs[10];
};

struct U64_10 {
    u64 data[10];
};

struct RistrettoPoint {
    FieldElement2625 X;
    FieldElement2625 Y;
    FieldElement2625 Z;
    FieldElement2625 T;
} ;

typedef struct {
    FieldElement2625 Y_plus_X;
    FieldElement2625 Y_minus_X;
    FieldElement2625 Z;
    FieldElement2625 T2d;
} ProjectiveNielsPoint;

typedef struct {
    FieldElement2625 X;
    FieldElement2625 Y;
    FieldElement2625 Z;
    FieldElement2625 T;
} CompletedPoint;

typedef struct {
    FieldElement2625 X;
    FieldElement2625 Y;
    FieldElement2625 Z;
} ProjectivePoint;

typedef struct {
    ProjectiveNielsPoint entries[8];
} LookupTable8;

typedef struct {
    i8 data[64];
} Radix16;

///
/// Scalar29 prototypes
///
__device__ Scalar29 Scalar29_add(const Scalar29* lhs, const Scalar29* rhs);
__device__ Scalar29 Scalar29_sub(const Scalar29* lhs, const Scalar29* rhs);
__device__ Scalar29 Scalar29_mul(const Scalar29* a, const Scalar29* b);
__device__ void Scalar29_pack(const Scalar29* a, u32* words, size_t grid_tid, size_t stride);
__device__ MulResult Scalar29_square_internal(const Scalar29* a);
__device__ MulResult Scalar29_mul_internal(const Scalar29* a, const Scalar29* b);
__device__ Scalar29 Scalar29_montgomery_reduce(MulResult* limbs);
__device__ Scalar29 Scalar29_unpack(const u32* words, size_t grid_tid, size_t stride);
__device__ Scalar29 Scalar29_montgomery_square(const Scalar29* x);
__device__ Scalar29 Scalar29_montgomery_mul(const Scalar29* a, const Scalar29* b);
__device__ void Scalar29_square_multiply(Scalar29 *volatile y, int squarings, const Scalar29* x);
__device__ Scalar29 Scalar29_to_montgomery(const Scalar29* val);
__device__ Scalar29 Scalar29_from_montgomery(const Scalar29* val);
__device__ Scalar29 Scalar29_invert(const Scalar29* a);
__device__ Scalar29 Scalar29_montgomery_invert(const Scalar29* a64l);
__device__ Scalar29 Scalar29_square(const Scalar29* val);
__device__ Radix16 Scalar29_as_radix_16(const Scalar29* a);

///
/// Field2625 prototypes
///
__device__ FieldElement2625 FieldElement2625_unpack(const u32* words, size_t grid_tid, size_t stride);
__device__ void FieldElement2625_pack(const FieldElement2625* a, u32* ptr, const size_t grid_tid, const size_t n);
__device__ FieldElement2625 FieldElement2625_add(const FieldElement2625* a, const FieldElement2625* b);
__device__ FieldElement2625 FieldElement2625_reduce( U64_10* val);
__device__ FieldElement2625 FieldElement2625_sub(const FieldElement2625* lhs, const FieldElement2625* rhs);
__device__ FieldElement2625 FieldElement2625_mul(const FieldElement2625* lhs, const FieldElement2625* rhs);
__device__ FieldElement2625 FieldElement2625_neg(const FieldElement2625* lhs);
__device__ U64_10 FieldElement2625_square_inner(const FieldElement2625* val);
__device__ FieldElement2625 FieldElement2625_square(const FieldElement2625* val);
__device__ FieldElement2625 FieldElement2625_square2(const FieldElement2625* val);

///
/// RistrettoPoint prototypes
///
__device__ RistrettoPoint RistrettoPoint_unpack(const u32* ptr, const size_t grid_tid, const size_t n);
__device__ void RistrettoPoint_pack(const RistrettoPoint* a, u32* ptr, size_t grid_tid, size_t n);
__device__ ProjectiveNielsPoint RistrettoPoint_as_projective_niels(const RistrettoPoint* a);
__device__ ProjectivePoint RistrettoPoint_as_projective(const RistrettoPoint* a);
__device__ RistrettoPoint RistrettoPoint_add(const RistrettoPoint* lhs, const RistrettoPoint* rhs);
__device__ CompletedPoint RistrettoPoint_add_projective_niels(const RistrettoPoint* lhs, const ProjectiveNielsPoint* rhs);
__device__ RistrettoPoint RistrettoPoint_sub(const RistrettoPoint* lhs, const RistrettoPoint* rhs);
__device__ CompletedPoint RistrettoPoint_sub_projective_niels(const RistrettoPoint* lhs, const ProjectiveNielsPoint* rhs);
__device__ RistrettoPoint RistrettoPoint_scalar_mul(const RistrettoPoint* lhs, const Scalar29* rhs);

///
/// ProjectiveNielsPoint prototypes
///
__device__ ProjectiveNielsPoint ProjectiveNielsPoint_neg(const ProjectiveNielsPoint* x);

///
/// ProjectivePoint prototypes
///
__device__ CompletedPoint ProjectivePoint_double_point(const ProjectivePoint* x);
__device__ RistrettoPoint ProjectivePoint_as_extended(const ProjectivePoint* a);

///
/// CompletedPoint prototypes
///
__device__ RistrettoPoint CompletedPoint_as_extended(const CompletedPoint* x);
__device__ ProjectivePoint CompletedPoint_as_projective(const CompletedPoint* x);

///
/// LookupTable8 prototype
///
__device__ LookupTable8 LookupTable8_init(const RistrettoPoint* p);
__device__ const ProjectiveNielsPoint LookupTable8_select(const LookupTable8* lut, i8 x);

///
/// __constant__s
///
const __constant__ Scalar29 Scalar29_Zero = {{0, 0, 0, 0, 0, 0, 0, 0, 0, 0}};
const __constant__ Scalar29 Scalar29_L = 
{{
    0x1cf5d3ed, 0x009318d2, 0x1de73596, 0x1df3bd45,
    0x0000014d, 0x00000000, 0x00000000, 0x00000000,
    0x00100000
}};

const __constant__ Scalar29 Scalar29_RR = {{
    0x0b5f9d12, 0x1e141b17, 0x158d7f3d, 0x143f3757,
    0x1972d781, 0x042feb7c, 0x1ceec73d, 0x1e184d1e,
    0x0005046d
}};

const __constant__ FieldElement2625 FieldElement2625_EDWARDS_D2 = {{
    45281625, 27714825, 36363642, 13898781, 229458, 15978800, 54557047, 27058993, 29715967, 9444199,
}};

#define FieldElement2625_ZERO {{0, 0, 0, 0, 0, 0, 0, 0, 0, 0}}

#define FieldElement2625_ONE {{1, 0, 0, 0, 0, 0, 0, 0, 0, 0}}

const __constant__ RistrettoPoint RistrettoPoint_IDENTITY = {
    FieldElement2625_ZERO,
    FieldElement2625_ONE,
    FieldElement2625_ONE,
    FieldElement2625_ZERO
};

const __constant__ ProjectiveNielsPoint ProjectiveNielsPoint_IDENTITY = {
    FieldElement2625_ONE,
    FieldElement2625_ONE,
    FieldElement2625_ONE,
    FieldElement2625_ZERO
};

const __constant__ ProjectivePoint ProjectivePoint_IDENTITY = {
    FieldElement2625_ZERO,
    FieldElement2625_ONE,
    FieldElement2625_ONE 
};

///
/// Helpers
///
inline __device__ u64 m(u32 a, u32 b) {
    return (u64)a * (u64)b;
}

inline __device__ MontMulLRes part1(u64 sum) {
    u32 p = ((u32)sum) * (0x12547e1b) & ((1u << 29) - 1);

    MontMulLRes c;
    c.carry = (sum + m(p,Scalar29_L.limbs[0])) >> 29;
    c.n = p; 
    return c;
}

inline __device__ MontMulLRes part2(u64 sum) {
    u32 w = ((u32)sum) & ((1u << 29) - 1);

    MontMulLRes c;
    c.carry = sum >> 29;
    c.n = w;

    return c;
}

/// Carry the value from limb i = 0..8 to limb i+1
inline __device__ void carry( u64 z[10], size_t i) {
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

///
/// Scalar29 impl
///

__device__ Scalar29 Scalar29_unpack(const u32* words, size_t grid_tid, size_t stride) {
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

__device__ void Scalar29_pack(const Scalar29* a, u32* words, size_t grid_tid, size_t stride) {
    words = &words[grid_tid];
    const u32* _limbs = a->limbs;

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

__device__ Scalar29 Scalar29_add(const Scalar29* lhs, const Scalar29* rhs) {
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

__device__ Scalar29 Scalar29_sub(const Scalar29* lhs, const Scalar29* rhs) {
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

__device__ Scalar29 Scalar29_mul(const Scalar29* a, const Scalar29* b) {
    MulResult c = Scalar29_mul_internal(a, b);
    Scalar29 ab = Scalar29_montgomery_reduce(&c);

    Scalar29 rr = Scalar29_RR;
    c = Scalar29_mul_internal(&ab, &rr);
    return Scalar29_montgomery_reduce(&c);
}

__device__ MulResult Scalar29_mul_internal(const Scalar29* lhs, const Scalar29* rhs) {
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

__device__ MulResult Scalar29_square_internal(const Scalar29* lhs) {
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

__device__ Scalar29 Scalar29_montgomery_reduce(MulResult* a) {
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

__device__ Scalar29 Scalar29_montgomery_square(const Scalar29* x) {
    MulResult y = Scalar29_square_internal(x);
    return Scalar29_montgomery_reduce(&y);
}

__device__ Scalar29 Scalar29_montgomery_mul(const Scalar29* a, const Scalar29* b) {
    MulResult y = Scalar29_mul_internal(a, b);
    return Scalar29_montgomery_reduce(&y);
}

__device__ void Scalar29_square_multiply(Scalar29 * volatile y, int squarings, const Scalar29* x) {
    for (int i = 0; i < squarings; i++) {
        *y = Scalar29_montgomery_square((Scalar29*)y);
    }
    *y = Scalar29_montgomery_mul((Scalar29*)y, x);
}

__device__ Scalar29 Scalar29_montgomery_invert(const Scalar29* a) {
    // Uses the addition chain from
    // https://briansmith.org/ecc-inversion-addition-chains-01#curve25519_scalar_inversion
    const Scalar29*   _1 = a;
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

__device__ Scalar29 Scalar29_to_montgomery(const Scalar29* val) {
    Scalar29 rr = Scalar29_RR;
    return Scalar29_montgomery_mul(val, &rr);
}

__device__ Scalar29 Scalar29_from_montgomery(const Scalar29* val) {
    MulResult z = {{0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0}};
    for (size_t i = 0; i < 9; i++) {
        z.limbs[i] = (u64)val->limbs[i];
    }
            
    return Scalar29_montgomery_reduce(&z);
}

__device__ Scalar29 Scalar29_invert(const Scalar29* a) {
    Scalar29 mont = Scalar29_to_montgomery(a);
    Scalar29 mont_inv = Scalar29_montgomery_invert(&mont);
    return Scalar29_from_montgomery(&mont_inv);
}

__device__ Scalar29 Scalar29_square(const Scalar29* val) {
    MulResult sq_mont = Scalar29_square_internal(val);
    Scalar29 aa = Scalar29_montgomery_reduce(&sq_mont);

    Scalar29 rr = Scalar29_RR;
    MulResult aa_rr = Scalar29_mul_internal(&aa, &rr);
    return Scalar29_montgomery_reduce(&aa_rr);
}

__device__ Radix16 Scalar29_as_radix_16(const Scalar29* a) {
    Radix16 res;
    i8* output = res.data;
    
    const u32* self = a->limbs;

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

///
/// Field2625 impl
///

__device__ FieldElement2625 FieldElement2625_unpack(const u32* ptr, const size_t grid_tid, const size_t n) {
    FieldElement2625 res;

    for (size_t i = 0; i < 10; i++) {
        res.limbs[i] = ptr[i * n + grid_tid];
    }

    return res;
}

__device__ void FieldElement2625_pack(const FieldElement2625* a, u32* ptr, const size_t grid_tid, const size_t n) {
    for (size_t i = 0; i < 10; i++) {
        ptr[i * n + grid_tid] = a->limbs[i];
    }
}

__device__ FieldElement2625 FieldElement2625_reduce( U64_10* val) {
    u64* z = val->data;
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

__device__ FieldElement2625 FieldElement2625_add(const FieldElement2625* lhs, const FieldElement2625* rhs) {
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

__device__ FieldElement2625 FieldElement2625_sub(const FieldElement2625* lhs, const FieldElement2625* rhs) {
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

__device__ FieldElement2625 FieldElement2625_mul(const FieldElement2625* lhs, const FieldElement2625* rhs) {
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

__device__ U64_10 FieldElement2625_square_inner(const FieldElement2625* val) {
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

__device__ FieldElement2625 FieldElement2625_square(const FieldElement2625* val) {
    U64_10 z = FieldElement2625_square_inner(val);
    return FieldElement2625_reduce(&z);
}

__device__ FieldElement2625 FieldElement2625_square2(const FieldElement2625* val) {
    U64_10 sq = FieldElement2625_square_inner(val);

    for (int i = 0; i < 10; i++) {
        sq.data[i] += sq.data[i];
    }

    return FieldElement2625_reduce(&sq);
}

__device__ FieldElement2625 FieldElement2625_neg(const FieldElement2625* lhs) {
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

///
/// RistrettoPoint impl
///

__device__ RistrettoPoint RistrettoPoint_unpack(const u32* ptr, const size_t grid_tid, const size_t n) {
    FieldElement2625 x = FieldElement2625_unpack(&ptr[00 * n], grid_tid, n);
    FieldElement2625 y = FieldElement2625_unpack(&ptr[10 * n], grid_tid, n);
    FieldElement2625 z = FieldElement2625_unpack(&ptr[20 * n], grid_tid, n);
    FieldElement2625 t = FieldElement2625_unpack(&ptr[30 * n], grid_tid, n);

    RistrettoPoint res = { x, y, z, t };

    return res;
}

__device__ void RistrettoPoint_pack(const RistrettoPoint* a, u32* ptr, size_t grid_tid, size_t n) {
    FieldElement2625_pack(&a->X, &ptr[00 * n], grid_tid, n);
    FieldElement2625_pack(&a->Y, &ptr[10 * n], grid_tid, n);
    FieldElement2625_pack(&a->Z, &ptr[20 * n], grid_tid, n);
    FieldElement2625_pack(&a->T, &ptr[30 * n], grid_tid, n);
}

__device__ ProjectiveNielsPoint RistrettoPoint_as_projective_niels(const RistrettoPoint* a) {
    FieldElement2625 y_plus_x = FieldElement2625_add(&a->Y, &a->X);
    FieldElement2625 y_minus_x = FieldElement2625_sub(&a->Y, &a->X);

    FieldElement2625 d2 = FieldElement2625_EDWARDS_D2;
    FieldElement2625 td2 = FieldElement2625_mul(&a->T, &d2);

    ProjectiveNielsPoint result = {
        y_plus_x,
        y_minus_x,
        a->Z,
        td2
    };

    return result;
}

__device__ ProjectivePoint RistrettoPoint_as_projective(const RistrettoPoint* a) {
    ProjectivePoint result = {
        a->X,
        a->Y,
        a->Z
    };

    return result;
}

__device__ RistrettoPoint RistrettoPoint_add(const RistrettoPoint* lhs, const RistrettoPoint* rhs) {
    ProjectiveNielsPoint rhs_pn = RistrettoPoint_as_projective_niels(rhs);
    CompletedPoint sum = RistrettoPoint_add_projective_niels(lhs, &rhs_pn);

    return CompletedPoint_as_extended(&sum);
}

__device__ CompletedPoint RistrettoPoint_add_projective_niels(const RistrettoPoint* lhs, const ProjectiveNielsPoint* rhs) {
    FieldElement2625 Y_plus_X = FieldElement2625_add(&lhs->Y, &lhs->X);
    FieldElement2625 Y_minus_X = FieldElement2625_sub(&lhs->Y, &lhs->X);
    FieldElement2625 PP = FieldElement2625_mul(&Y_plus_X, &rhs->Y_plus_X);
    FieldElement2625 MM = FieldElement2625_mul(&Y_minus_X, &rhs->Y_minus_X);
    FieldElement2625 TT2d = FieldElement2625_mul(&lhs->T, &rhs->T2d);
    FieldElement2625 ZZ = FieldElement2625_mul(&lhs->Z, &rhs->Z);
    FieldElement2625 ZZ2 = FieldElement2625_add(&ZZ, &ZZ);


    CompletedPoint result = {
        FieldElement2625_sub(&PP, &MM),
        FieldElement2625_add(&PP, &MM),
        FieldElement2625_add(&ZZ2, &TT2d),
        FieldElement2625_sub(&ZZ2, &TT2d)
    };

    return result;
}

__device__ RistrettoPoint RistrettoPoint_sub(const RistrettoPoint* lhs, const RistrettoPoint* rhs) {
    ProjectiveNielsPoint rhs_pn = RistrettoPoint_as_projective_niels(rhs);
    CompletedPoint sum = RistrettoPoint_sub_projective_niels(lhs, &rhs_pn);

    return CompletedPoint_as_extended(&sum);
}

__device__ CompletedPoint RistrettoPoint_sub_projective_niels(const RistrettoPoint* lhs, const ProjectiveNielsPoint* rhs) {
    FieldElement2625 Y_plus_X = FieldElement2625_add(&lhs->Y, &lhs->X);
    FieldElement2625 Y_minus_X = FieldElement2625_sub(&lhs->Y, &lhs->X);
    FieldElement2625 PM = FieldElement2625_mul(&Y_plus_X, &rhs->Y_minus_X);
    FieldElement2625 MP = FieldElement2625_mul(&Y_minus_X, &rhs->Y_plus_X);
    FieldElement2625 TT2d = FieldElement2625_mul(&lhs->T, &rhs->T2d);
    FieldElement2625 ZZ = FieldElement2625_mul(&lhs->Z, &rhs->Z);
    FieldElement2625 ZZ2 = FieldElement2625_add(&ZZ, &ZZ);

    CompletedPoint result = {
        FieldElement2625_sub(&PM, &MP),
        FieldElement2625_add(&PM, &MP),
        FieldElement2625_sub(&ZZ2, &TT2d),
        FieldElement2625_add(&ZZ2, &TT2d)
    };

    return result;
}

__device__ RistrettoPoint RistrettoPoint_scalar_mul(const RistrettoPoint* lhs, const Scalar29* rhs) {
    // A lookup table for Radix-8 multiplication. Contains [0P, 1P, 2P, ...]
    LookupTable8 lut = LookupTable8_init(lhs);

    Radix16 scalar_digits = Scalar29_as_radix_16(rhs);

    // Copy from contant to thread storage. We'll also use this to store the 16P value in standard
    // projection.
    RistrettoPoint tmp2 = RistrettoPoint_IDENTITY;

    ProjectiveNielsPoint lut_val = LookupTable8_select(&lut, scalar_digits.data[63]);

    // Compute the highest nibble scalar's contribution
    CompletedPoint sum = RistrettoPoint_add_projective_niels(&tmp2, &lut_val);
    ProjectivePoint tmp = ProjectivePoint_IDENTITY;

    for (size_t i = 0; i < 63; i++) {
        size_t j = 62 - i;

        tmp = CompletedPoint_as_projective(&sum);
        sum = ProjectivePoint_double_point(&tmp);
        tmp = CompletedPoint_as_projective(&sum);
        sum = ProjectivePoint_double_point(&tmp);
        tmp = CompletedPoint_as_projective(&sum);
        sum = ProjectivePoint_double_point(&tmp);
        tmp = CompletedPoint_as_projective(&sum);
        sum = ProjectivePoint_double_point(&tmp);
        tmp2 = CompletedPoint_as_extended(&sum);

        lut_val = LookupTable8_select(&lut, scalar_digits.data[j]);

        sum = RistrettoPoint_add_projective_niels(&tmp2, &lut_val);
    }

    return CompletedPoint_as_extended(&sum);
}

///
/// ProjectiveNielsPoint impl
///
__device__ ProjectiveNielsPoint ProjectiveNielsPoint_neg(const ProjectiveNielsPoint* a) {
    ProjectiveNielsPoint ret = {
        a->Y_minus_X,
        a->Y_plus_X,
        a->Z,
        FieldElement2625_neg(&a->T2d)
    };

    return ret;
}

///
/// ProjectivePoint impl
///
__device__ CompletedPoint ProjectivePoint_double_point(const ProjectivePoint* a) {
    FieldElement2625 XX = FieldElement2625_square(&a->X);
    FieldElement2625 YY = FieldElement2625_square(&a->Y);;
    FieldElement2625 ZZ2 = FieldElement2625_square2(&a->Z);
    FieldElement2625 X_plus_Y = FieldElement2625_add(&a->X, &a->Y);
    FieldElement2625 X_plus_Y_sq = FieldElement2625_square(&X_plus_Y);
    FieldElement2625 YY_plus_XX = FieldElement2625_add(&YY, &XX);
    FieldElement2625 YY_minus_XX = FieldElement2625_sub(&YY, &XX);

    CompletedPoint ret = {
        FieldElement2625_sub(&X_plus_Y_sq, &YY_plus_XX),
        YY_plus_XX,
        YY_minus_XX,
        FieldElement2625_sub(&ZZ2, &YY_minus_XX)
    };

    return ret;
}

__device__ RistrettoPoint ProjectivePoint_as_extended(const ProjectivePoint* a) {
    FieldElement2625 X = FieldElement2625_mul(&a->X, &a->Z);
    FieldElement2625 Y = FieldElement2625_mul(&a->Y, &a->Z);
    FieldElement2625 Z = FieldElement2625_square(&a->Z);
    FieldElement2625 T = FieldElement2625_mul(&a->X, &a->Y);

    RistrettoPoint ret = {
        X,
        Y,
        Z,
        T
    };

    return ret;
}

///
/// CompletedPoint impl
///

__device__ RistrettoPoint CompletedPoint_as_extended(const CompletedPoint* a) {
    FieldElement2625 X = FieldElement2625_mul(&a->X, &a->T);
    FieldElement2625 Y = FieldElement2625_mul(&a->Y, &a->Z);
    FieldElement2625 Z = FieldElement2625_mul(&a->Z, &a->T);
    FieldElement2625 T = FieldElement2625_mul(&a->X, &a->Y);

    RistrettoPoint result = {
        X,
        Y,
        Z,
        T
    };

    return result;
}

__device__ ProjectivePoint CompletedPoint_as_projective(const CompletedPoint* a) {
    FieldElement2625 X = FieldElement2625_mul(&a->X, &a->T);
    FieldElement2625 Y = FieldElement2625_mul(&a->Y, &a->Z);
    FieldElement2625 Z = FieldElement2625_mul(&a->Z, &a->T);

    ProjectivePoint result = { X, Y, Z };

    return result;
}

///
/// LookupTable8 impl
///
__device__ LookupTable8 LookupTable8_init(const RistrettoPoint* p) {
    LookupTable8 table;

    table.entries[0] = RistrettoPoint_as_projective_niels(p);

    for (size_t i = 1; i < 8; i++) {
        CompletedPoint s = RistrettoPoint_add_projective_niels(p, &table.entries[i - 1]);
        RistrettoPoint s_r = CompletedPoint_as_extended(&s);
        ProjectiveNielsPoint s_p = RistrettoPoint_as_projective_niels(&s_r);

        table.entries[i] = s_p;
    }

    return table;
}

__device__ const ProjectiveNielsPoint LookupTable8_select(const LookupTable8* lut, i8 x) {
    ProjectiveNielsPoint ret = ProjectiveNielsPoint_IDENTITY;
    size_t idx = abs(x);

    ret = x > 0 ? lut->entries[idx - 1] : ret;
    ret = x < 0 ? ProjectiveNielsPoint_neg(&lut->entries[idx - 1]) : ret;

    return ret;
}

///
/// Kernels
///

extern "C" __global__ void scalar_add(
    const u32* a,
     const u32* b,
     u32* c,
    const u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);
        Scalar29 t_b = Scalar29_unpack(b, tid, len);

        Scalar29 t_c = Scalar29_add(&t_a, &t_b);
        Scalar29_pack(&t_c, c, tid, len);
    }
}

extern "C" __global__ void scalar_sub(
    const u32* a,
    const u32* b,
    u32* c,
    u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);
        Scalar29 t_b = Scalar29_unpack(b, tid, len);

        Scalar29 t_c = Scalar29_sub(&t_a, &t_b);

        Scalar29_pack(&t_c, c, tid, len);
    }
}

extern "C" __global__ void scalar_neg(
    const u32* a,
    u32* b,
    u32 len 
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);
        Scalar29 zero = Scalar29_Zero;

        Scalar29 t_c = Scalar29_sub(&zero, &t_a);
        Scalar29_pack(&t_c, b, tid, len);
    }
}

extern "C" __global__ void scalar_mul(
    const u32* a,
    const u32* b,
    u32* c ,
    u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);
        Scalar29 t_b = Scalar29_unpack(b, tid, len);

        Scalar29 t_c = Scalar29_mul(&t_a, &t_b);

        Scalar29_pack(&t_c, c, tid, len);
    }
}

extern "C" __global__ void scalar_invert(
    const u32* a,
    u32* b,
    u32 len 
) {
    u32 tid = threadIdx.x;
    
    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);

        Scalar29 t_a_inv = Scalar29_invert(&t_a);
        Scalar29_pack(&t_a_inv, b, tid, len);
    }
}

extern "C" __global__ void scalar_square(
    const u32* a,
    u32* b,
    u32 len 
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        Scalar29 t_a = Scalar29_unpack(a, tid, len);
        Scalar29 t_a_sq = Scalar29_square(&t_a);

        Scalar29_pack(&t_a_sq, b, tid, len);
    }
}

extern "C" __global__ void ristretto_add(
    const u32* a,
    const u32* b,
    u32* c,
    u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        RistrettoPoint t_a = RistrettoPoint_unpack(a, tid, len);
        RistrettoPoint t_b = RistrettoPoint_unpack(b, tid, len);
        RistrettoPoint t_c = RistrettoPoint_add(&t_a, &t_b);
        
        RistrettoPoint_pack(&t_c, c, tid, len);
    }
}

extern "C" __global__ void ristretto_sub(
    const u32* a,
    const u32* b,
    u32* c,
    u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        RistrettoPoint t_a = RistrettoPoint_unpack(a, tid, len);
        RistrettoPoint t_b = RistrettoPoint_unpack(b, tid, len);
        RistrettoPoint t_c = RistrettoPoint_sub(&t_a, &t_b);
        
        RistrettoPoint_pack(&t_c, c, tid, len);
    }
}

extern "C" __global__ void ristretto_scalar_mul(
    const u32* a,
    const u32* b,
    u32* c,
    u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        RistrettoPoint t_a = RistrettoPoint_unpack(a, tid, len);
        Scalar29 t_b = Scalar29_unpack(b, tid, len);
        RistrettoPoint t_c = RistrettoPoint_scalar_mul(&t_a, &t_b);
        
        RistrettoPoint_pack(&t_c, c, tid, len);
    }
}

///
/// TESTS
///

#if defined(TEST)

extern "C" __global__ void basic_kernel(
    const u32* a,
    const u32* b,
    u32* c,
    const u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        c[tid] = a[tid] + b[tid];
    }
}

extern "C" __global__ void test_can_pack_unpack_scalar(
    const u32* a,
    u32* b,
    const u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        Scalar29 val = Scalar29_unpack(a, tid, len);
        Scalar29_pack(&val, b, tid, len);
    }
}

extern "C" __global__ void test_can_roundtrip_montgomery(
    const u32* a,
    u32* b,
    const u32 len 
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        Scalar29 x = Scalar29_unpack(a, tid, len);
        Scalar29 x_mont = Scalar29_to_montgomery(&x);
        Scalar29 y = Scalar29_from_montgomery(&x_mont);

        Scalar29_pack(&y, b, tid, len);
    }
}

extern "C" __global__ void test_can_pack_unpack_ristretto(
    const u32* a,
    u32* b,
    const u32 len 
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        RistrettoPoint val = RistrettoPoint_unpack(a, tid, len);
        RistrettoPoint_pack(&val, b, tid, len);
    }
}

extern "C" __global__ void test_can_roundtrip_projective_point(
    const u32* a,
    u32* b,
    const u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        RistrettoPoint x = RistrettoPoint_unpack(a, tid, len);
        ProjectivePoint x_p = RistrettoPoint_as_projective(&x);
        RistrettoPoint x_e = ProjectivePoint_as_extended(&x_p);

        RistrettoPoint_pack(&x_e, b, tid, len);
    }
}

extern "C" __global__ void test_can_double_projective_point(
    const u32* a,
    u32* b,
    const u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        RistrettoPoint x = RistrettoPoint_unpack(a, tid, len);
        ProjectivePoint x_p = RistrettoPoint_as_projective(&x);
        CompletedPoint x_p_2 = ProjectivePoint_double_point(&x_p);
        RistrettoPoint y = CompletedPoint_as_extended(&x_p_2);

        RistrettoPoint_pack(&y, b, tid, len);
    }
}

extern "C" __global__ void test_can_pack_unpack_field2625(
    const u32* a,
    u32* b,
    const u32 len
) {
    u32 tid = threadIdx.x;

    if (tid < len) {
        FieldElement2625 x = FieldElement2625_unpack(a, tid, len);
        FieldElement2625_pack(&x, b, tid, len);
    }
}

#endif // ifdef TEST
#else
#endif // #ifdef CUDA_C