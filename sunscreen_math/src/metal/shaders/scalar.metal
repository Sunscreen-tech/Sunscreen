#include <inttypes>
#include <constants>
#include <scalar>

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

constant u32 data[] = {0, 0, 0, 0, 0, 0, 0, 0, 0};

constant Scalar29 Scalar29::Zero(data);

kernel void test_can_pack_unpack(
    device const u32* a [[buffer(0)]],
    device u32* b [[buffer(1)]],
    u32 tid [[thread_position_in_grid]],
    constant u32& len [[buffer(2)]]
) {
    auto x = Scalar29::unpack(a, tid, len);
    x.pack(b, tid, len);
}