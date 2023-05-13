#pragma once

#include <inttypes.h.cl>
#include <field2625.h.cl>

typedef struct {
    FieldElement2625 X;
    FieldElement2625 Y;
    FieldElement2625 Z;
    FieldElement2625 T;
} RistrettoPoint;

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

RistrettoPoint RistrettoPoint_unpack(const global u32* ptr, const size_t grid_tid, const size_t n);
void RistrettoPoint_pack(const RistrettoPoint* this, global u32* ptr, size_t grid_tid, size_t n);
ProjectiveNielsPoint RistrettoPoint_as_projective_niels(const RistrettoPoint* this);
ProjectivePoint RistrettoPoint_as_projective(const RistrettoPoint* this);
RistrettoPoint RistrettoPoint_add(const RistrettoPoint* lhs, const RistrettoPoint* rhs);
CompletedPoint RistrettoPoint_add_projective_niels(const RistrettoPoint* lhs, const ProjectiveNielsPoint* rhs);
RistrettoPoint RistrettoPoint_sub(const RistrettoPoint* lhs, const RistrettoPoint* rhs);
CompletedPoint RistrettoPoint_sub_projective_niels(const RistrettoPoint* lhs, const ProjectiveNielsPoint* rhs);
RistrettoPoint RistrettoPoint_scalar_mul(const RistrettoPoint* lhs, const Scalar29* rhs);

///
/// ProjectiveNielsPoint prototypes
///
ProjectiveNielsPoint ProjectiveNielsPoint_neg(const ProjectiveNielsPoint* x);

///
/// ProjectivePoint prototypes
///
CompletedPoint ProjectivePoint_double_point(const ProjectivePoint* x);
RistrettoPoint ProjectivePoint_as_extended(const ProjectivePoint* this);

///
/// CompletedPoint prototypes
///
RistrettoPoint CompletedPoint_as_extended(const CompletedPoint* x);
ProjectivePoint CompletedPoint_as_projective(const CompletedPoint* x);

///
/// LookupTable8 prototype
///
LookupTable8 LookupTable8_init(const RistrettoPoint* p);
const ProjectiveNielsPoint LookupTable8_select(const LookupTable8* lut, i8 x);