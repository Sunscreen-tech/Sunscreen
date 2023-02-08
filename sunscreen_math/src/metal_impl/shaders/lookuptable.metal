#if defined(TEST)
#include <ristretto.hpp.metal>
#include <lookuptable.hpp.metal>

kernel void test_lut(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b0 [[buffer(1)]],
    device u32* b1 [[buffer(2)]],
    device u32* b2 [[buffer(3)]],
    device u32* b3 [[buffer(4)]],
    constant u32& len [[buffer(5)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);

    LookupTable<4> lut(x);

    auto identity = RistrettoPoint::IDENTITY;

    auto _b0 = lut.select(0);
    auto _b1 = lut.select(1);
    auto _b2 = lut.select(2);
    auto _b3 = lut.select(3);

    // Add identity to coerse the point to completed so we can project back to RistrettoPoint.
    (identity + _b0).as_extended().pack(b0, tid, len);
    (identity + _b1).as_extended().pack(b1, tid, len);
    (identity + _b2).as_extended().pack(b2, tid, len);
    (identity + _b3).as_extended().pack(b3, tid, len);
}

#endif