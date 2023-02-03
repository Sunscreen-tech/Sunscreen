#include <ristretto.hpp.metal>
#include <constants.hpp.metal>

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

///
/// TESTS. TODO: don't include in release builds.
///
kernel void test_can_pack_unpack_ristretto(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    constant u32& len [[buffer(2)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);
    x.pack(b, tid, len);
}
