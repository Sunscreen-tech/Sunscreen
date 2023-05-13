#pragma once

#include <inttypes.h.cl>

typedef struct {
    u32 limbs[10];
} Scalar29;

typedef struct {
    i8 data[64];
} Radix16;

typedef struct {
    ulong limbs[17];
} MulResult;

typedef struct {
    u64 carry;
    u32 n;
} MontMulLRes;

Scalar29 Scalar29_add(const Scalar29* lhs, const Scalar29* rhs);
Scalar29 Scalar29_sub(const Scalar29* lhs, const Scalar29* rhs);
Scalar29 Scalar29_mul(const Scalar29* a, const Scalar29* b);
void Scalar29_pack(const Scalar29* this, global u32* words, size_t grid_tid, size_t stride);
MulResult Scalar29_square_internal(const Scalar29* a);
MulResult Scalar29_mul_internal(const Scalar29* a, const Scalar29* b);
Scalar29 Scalar29_montgomery_reduce(MulResult* limbs);
Scalar29 Scalar29_unpack(const global u32* words, size_t grid_tid, size_t stride);
Scalar29 Scalar29_montgomery_square(const Scalar29* x);
Scalar29 Scalar29_montgomery_mul(const Scalar29* a, const Scalar29* b);
void Scalar29_square_multiply(volatile Scalar29* y, int squarings, const Scalar29* x);
Scalar29 Scalar29_to_montgomery(const Scalar29* val);
Scalar29 Scalar29_from_montgomery(const Scalar29* val);
Scalar29 Scalar29_invert(const Scalar29* a);
Scalar29 Scalar29_montgomery_invert(const Scalar29* this);
Scalar29 Scalar29_square(const Scalar29* val);
Radix16 Scalar29_as_radix_16(const Scalar29* this);