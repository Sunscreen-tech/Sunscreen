#if !defined(CUDA_C) && false
#if defined(TEST)
#include <ristretto.hpp.cu>
#include <lookuptable.hpp.cu>

kernel void test_lut(
    u32 tid [[thread_position_in_grid]],
    device const u32* a [[buffer(0)]],
    device u32* b0 [[buffer(1)]],
    device u32* b1 [[buffer(2)]],
    device u32* b2 [[buffer(3)]],
    device u32* b3 [[buffer(4)]],
    device u32* b4 [[buffer(5)]],
    device u32* b5 [[buffer(6)]],
    device u32* b6 [[buffer(7)]],
    device u32* b7 [[buffer(8)]],
    constant u32& len [[buffer(9)]]
) {
    auto x = RistrettoPoint::unpack(a, tid, len);

    LookupTable<4> lut(x);

    auto identity = RistrettoPoint::IDENTITY;

    auto _b0 = lut.select(0);
    auto _b1 = lut.select(1);
    auto _b2 = lut.select(2);
    auto _b3 = lut.select(3);
    auto _b4 = lut.select(-1);
    auto _b5 = lut.select(-2);
    auto _b6 = lut.select(-3);
    auto _b7 = lut.select(-4);

    // Add identity to coerse the point to completed so we can project back to RistrettoPoint.
    (identity + _b0).as_extended().pack(b0, tid, len);
    (identity + _b1).as_extended().pack(b1, tid, len);
    (identity + _b2).as_extended().pack(b2, tid, len);
    (identity + _b3).as_extended().pack(b3, tid, len);
    (identity + _b4).as_extended().pack(b4, tid, len);
    (identity + _b5).as_extended().pack(b5, tid, len);
    (identity + _b6).as_extended().pack(b6, tid, len);
    (identity + _b7).as_extended().pack(b7, tid, len);
}

#endif // #if defined(TEST)
#endif // #if !defined(CUDA_C)