#include <ristretto.hpp.metal>
#include <constants.hpp.metal>
#include <lookuptable.hpp.metal>

const constant RistrettoPoint RistrettoPoint::IDENTITY = RistrettoPoint(
    FieldElement2625::ZERO,
    FieldElement2625::ONE,
    FieldElement2625::ONE,
    FieldElement2625::ZERO
);

const constant ProjectiveNielsPoint ProjectiveNielsPoint::IDENTITY = ProjectiveNielsPoint(
    FieldElement2625::ONE,
    FieldElement2625::ONE,
    FieldElement2625::ONE,
    FieldElement2625::ZERO
);

const constant ProjectivePoint ProjectivePoint::IDENTITY = ProjectivePoint(
    FieldElement2625::ZERO,
    FieldElement2625::ONE,
    FieldElement2625::ONE
);

RistrettoPoint RistrettoPoint::unpack(device const u32* ptr, const size_t grid_tid, const size_t n) {
    auto x = FieldElement2625::unpack(&ptr[00 * n], grid_tid, n);
    auto y = FieldElement2625::unpack(&ptr[10 * n], grid_tid, n);
    auto z = FieldElement2625::unpack(&ptr[20 * n], grid_tid, n);
    auto t = FieldElement2625::unpack(&ptr[30 * n], grid_tid, n);

    return RistrettoPoint(x, y, z, t);
}

void RistrettoPoint::pack(device u32* ptr, size_t grid_tid, size_t n) {
    this->X.pack(&ptr[00 * n], grid_tid, n);
    this->Y.pack(&ptr[10 * n], grid_tid, n);
    this->Z.pack(&ptr[20 * n], grid_tid, n);
    this->T.pack(&ptr[30 * n], grid_tid, n);
}

/// Convert to a ProjectiveNielsPoint
ProjectiveNielsPoint RistrettoPoint::as_projective_niels() const {
    FieldElement2625 y_plus_x = this->Y + this->X;
    FieldElement2625 y_minus_x = this->Y - this->X;
    FieldElement2625 t2d = this->T * constants::EDWARDS_D2;

    return ProjectiveNielsPoint(y_plus_x, y_minus_x, this->Z, t2d);
}

ProjectivePoint RistrettoPoint::as_projective() const {
    return ProjectivePoint(this->X, this->Y, this->Z);
}

RistrettoPoint RistrettoPoint::operator+(const thread RistrettoPoint& rhs) const {
    return (*this + rhs.as_projective_niels()).as_extended();
}

CompletedPoint RistrettoPoint::operator+(const thread ProjectiveNielsPoint& rhs) const thread {
    FieldElement2625 Y_plus_X = this->Y + this->X;
    FieldElement2625 Y_minus_X = this->Y - this->X;
    FieldElement2625 PP = Y_plus_X * rhs.Y_plus_X;
    FieldElement2625 MM = Y_minus_X * rhs.Y_minus_X;
    FieldElement2625 TT2d = this->T * rhs.T2d;
    FieldElement2625 ZZ = this->Z * rhs.Z;
    FieldElement2625 ZZ2 = ZZ + ZZ;

    return CompletedPoint(
        PP - MM,
        PP + MM,
        ZZ2 + TT2d,
        ZZ2 - TT2d
    );
}

RistrettoPoint RistrettoPoint::operator-(const thread RistrettoPoint& rhs) const {
    return (*this - rhs.as_projective_niels()).as_extended();
}

CompletedPoint RistrettoPoint::operator-(const thread ProjectiveNielsPoint& rhs) const {
    FieldElement2625 Y_plus_X = this->Y + this->X;
    FieldElement2625 Y_minus_X = this->Y - this->X;
    FieldElement2625 PM = Y_plus_X * rhs.Y_minus_X;
    FieldElement2625 MP = Y_minus_X * rhs.Y_plus_X;
    FieldElement2625 TT2d = this->T * rhs.T2d;
    FieldElement2625 ZZ = this->Z * rhs.Z;
    FieldElement2625 ZZ2 = ZZ + ZZ;

    return CompletedPoint(
        PM - MP,
        PM + MP,
        ZZ2 - TT2d,
        ZZ2 + TT2d
    );
}

RistrettoPoint CompletedPoint::as_extended() const {
    FieldElement2625 X = this->X * this->T;
    FieldElement2625 Y = this->Y * this->Z;
    FieldElement2625 Z = this->Z * this->T;
    FieldElement2625 T = this->X * this->Y;

    return RistrettoPoint(X, Y, Z, T);
}

ProjectivePoint CompletedPoint::as_projective() const {
    FieldElement2625 X = this->X * this->T;
    FieldElement2625 Y = this->Y * this->Z;
    FieldElement2625 Z = this->Z * this->T;

    return ProjectivePoint(X, Y, Z);
}

/*
RistrettoPoint RistrettoPoint::scalar_mul(const RistrettoPoint lhs, const Scalar29 rhs) {
    // Rematerialize the limbs of the scalar from S29 to S32
    u32 words[8];
    
    u32 word = rhs[0] | rhs[1] << 29;
    words[0] = word;
    word = rhs[1] >> 3 | rhs[2] << 26;
    words[1] = word;
    word = rhs[2] >> 6 | rhs[3] << 23;
    words[2] = word;
    word = rhs[3] >> 9 | rhs[4] << 20;
    words[3] = word;
    word = rhs[4] >> 12 | rhs[5] << 17;
    words[4] = word;
    word = rhs[5] >> 15 | rhs[6] << 14;
    words[5] = word;
    word = rhs[6] >> 18 | rhs[7] << 11;
    words[6] = word;
    word = rhs[7] >> 21 | rhs[8] << 8;
    words[7] = word;

    auto sum = RistrettoPoint::IDENTITY;
    auto pow = lhs;

    for (size_t i = 0; i < 8; i++) {
        auto word = words[i];

        for (size_t j = 0; j < 32; j++) {
            if (word & (0x1 << j)) {
                sum = sum + pow;
            }

            pow = pow + pow;
        }
    }

    return sum;
}*/

inline u8 get_nibble(u32 word, u8 nibble) {
    auto shift_amount = nibble * 4;

    return (word & (0xF << shift_amount)) >> shift_amount;
}

RistrettoPoint RistrettoPoint::scalar_mul(const RistrettoPoint lhs, const Scalar29 rhs) {
    // A lookup table for Radix-8 multiplication. Contains [0P, 1P, 2P, ...]
    LookupTable<8> lut(lhs);

    // Rematerialize the limbs of the scalar from S29 to S32
    // TODO: use the 
    u32 words[8];
    
    u32 word = rhs[0] | rhs[1] << 29;
    words[0] = word;
    word = rhs[1] >> 3 | rhs[2] << 26;
    words[1] = word;
    word = rhs[2] >> 6 | rhs[3] << 23;
    words[2] = word;
    word = rhs[3] >> 9 | rhs[4] << 20;
    words[3] = word;
    word = rhs[4] >> 12 | rhs[5] << 17;
    words[4] = word;
    word = rhs[5] >> 15 | rhs[6] << 14;
    words[5] = word;
    word = rhs[6] >> 18 | rhs[7] << 11;
    words[6] = word;
    word = rhs[7] >> 21 | rhs[8] << 8;
    words[7] = word;

    // Copy from contant to thread storage. We'll also use this to store the 16P value in standard
    // projection.
    RistrettoPoint tmp2 = RistrettoPoint::IDENTITY;

    // Compute the highest nibble scalar's contribution
    CompletedPoint sum = (tmp2 + lut.select(get_nibble(words[7], 7)));
    ProjectivePoint tmp = ProjectivePoint::IDENTITY;

    // Compute the rest of the highest word's contribution
    for (size_t j = 1; j < 8; j++) {
        auto word = words[7];

        // Multiply sum by 16 and then add the next nibble's contribution.
        tmp = sum.as_projective();
        sum = tmp.double_point();
        tmp = sum.as_projective();
        sum = tmp.double_point();
        tmp = sum.as_projective();
        sum = tmp.double_point();
        tmp = sum.as_projective();
        sum = tmp.double_point();
        tmp2 = sum.as_extended();

        sum = tmp2 + lut.select(get_nibble(word, 7 - j));
    }

    for (size_t i = 1; i < 8; i++) {
        auto word = words[7 - i];

        for (size_t j = 0; j < 4; j++) {
            tmp = sum.as_projective();
            sum = tmp.double_point();
            tmp = sum.as_projective();
            sum = tmp.double_point();
            tmp = sum.as_projective();
            sum = tmp.double_point();
            tmp = sum.as_projective();
            sum = tmp.double_point();
            tmp2 = sum.as_extended();

            sum = tmp2 + lut.select(get_nibble(word, 7 - j));

        }
    }

    return sum.as_extended();
}

RistrettoPoint RistrettoPoint::operator*(const thread Scalar29& rhs) const thread {
    return RistrettoPoint::scalar_mul(*this, rhs);
}

CompletedPoint ProjectivePoint::double_point() const thread {
    auto XX = this->X.square();
    auto YY = this->Y.square();
    auto ZZ2 = this->Z.square2();
    auto X_plus_Y = this->X + this->Y;
    auto X_plus_Y_sq = X_plus_Y.square();
    auto YY_plus_XX = YY + XX;
    auto YY_minus_XX = YY - XX;

    return CompletedPoint (
        X_plus_Y_sq - YY_plus_XX,
        YY_plus_XX,
        YY_minus_XX,
        ZZ2 - YY_minus_XX
    );
}

RistrettoPoint ProjectivePoint::as_extended() const thread {
    auto X = this->X * this->Z;
    auto Y = this->Y * this->Z;
    auto Z = this->Z.square();
    auto T = this->X * this->Y;

    return RistrettoPoint(
        X,
        Y,
        Z,
        T
    );
}

kernel void ristretto_add(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device const u32* b [[buffer(1)]],
    device u32* c [[buffer(2)]],
    constant u32& len [[buffer(3)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);
    auto y = RistrettoPoint::unpack(b, tid, len);

    (x + y).pack(c, tid, len);
}

kernel void ristretto_sub(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device const u32* b [[buffer(1)]],
    device u32* c [[buffer(2)]],
    constant u32& len [[buffer(3)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);
    auto y = RistrettoPoint::unpack(b, tid, len);

    (x - y).pack(c, tid, len);
}

kernel void ristretto_scalar_mul(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]], // Packed Ristretto points
    device const u32* b [[buffer(1)]], // Packed Scalars
    device u32* c [[buffer(2)]],
    constant u32& len [[buffer(3)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);
    auto y = Scalar29::unpack(b, tid, len);

    (x * y).pack(c, tid, len);
}

///
/// TESTS.
///
#if defined(TEST)
kernel void test_can_pack_unpack_ristretto(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    constant u32& len [[buffer(2)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);
    x.pack(b, tid, len);
}

kernel void test_add_identity_ristretto(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    constant u32& len [[buffer(2)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);
    auto y = RistrettoPoint::IDENTITY;

    (x + y).pack(b, tid, len);
}

kernel void test_can_roundtrip_projective_point(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    constant u32& len [[buffer(2)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);
    auto y = x.as_projective().as_extended();

    y.pack(b, tid, len);
}

kernel void test_can_add_ristretto_projective_niels_point(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    constant u32& len [[buffer(2)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);
    auto y = x.as_projective_niels();

    (x + y).as_extended().pack(b, tid, len);
}

kernel void test_can_double_projective_point(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    constant u32& len [[buffer(2)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);
    auto y = x.as_projective().double_point().as_extended();

    y.pack(b, tid, len);
}

#endif