#include <ristretto.hpp.metal>

RistrettoPoint RistrettoPoint::unpack(device const u32* ptr, const size_t grid_tid, const size_t n) {
    auto x = FieldElement2625::unpack(&ptr[00 * n], grid_tid, n);
    auto y = FieldElement2625::unpack(&ptr[10 * n], grid_tid, n);
    auto z = FieldElement2625::unpack(&ptr[20 * n], grid_tid, n);
    auto t = FieldElement2625::unpack(&ptr[30 * n], grid_tid, n);

    return RistrettoPoint(x, y, z, t);
}

void RistrettoPoint::pack(device u32* ptr, size_t grid_tid, size_t n) {
    this->x.pack(&ptr[00 * n], grid_tid, n);
    this->y.pack(&ptr[10 * n], grid_tid, n);
    this->z.pack(&ptr[20 * n], grid_tid, n);
    this->t.pack(&ptr[30 * n], grid_tid, n);
}

/// Convert to a ProjectiveNielsPoint
ProjectiveNielsPoint RistrettoPoint::as_projective_niels() {
    FieldElement2625 y_plus_x = this->y + this->x;
    FieldElement2625 y_minus_x = this->y - this->x;
    FieldElement2625 t2d = this->t * constants::EDWARDS_D2;

    return ProjectiveNielsPoint(y_plus_x, y_minus_x, this->z, t2d);
}


kernel void test_can_pack_unpack_ristretto(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    constant u32& len [[buffer(2)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);
    x.pack(b, tid, len);
}