#pragma once

#include <inttypes.h.cl>

typedef struct {
    u32 limbs[10];
} FieldElement2625;

typedef struct {
    u64 data[10];
} U64_10;

FieldElement2625 FieldElement2625_unpack(const global u32* words, size_t grid_tid, size_t stride);
FieldElement2625 FieldElement2625_unpack_local(const local u32* words, size_t grid_tid, size_t stride);
void FieldElement2625_pack(const FieldElement2625* a, global u32* ptr, const size_t grid_tid, const size_t n);
void FieldElement2625_pack_local(const FieldElement2625* a, local u32* ptr, const size_t grid_tid, const size_t n);
FieldElement2625 FieldElement2625_add(const FieldElement2625* a, const FieldElement2625* b);
FieldElement2625 FieldElement2625_reduce(private U64_10* val);
FieldElement2625 FieldElement2625_sub(const FieldElement2625* lhs, const FieldElement2625* rhs);
FieldElement2625 FieldElement2625_mul(const FieldElement2625* lhs, const FieldElement2625* rhs);
FieldElement2625 FieldElement2625_neg(const FieldElement2625* lhs);
U64_10 FieldElement2625_square_inner(const FieldElement2625* val);
FieldElement2625 FieldElement2625_square(const FieldElement2625* val);
FieldElement2625 FieldElement2625_square2(const FieldElement2625* val);
