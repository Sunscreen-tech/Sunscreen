#pragma once

#include <scalar29.h.cl>
#include <field2625.h.cl>
#include <ristrettopoint.h.cl>

#define FieldElement2625_ZERO {{0, 0, 0, 0, 0, 0, 0, 0, 0, 0}}
#define FieldElement2625_ONE {{1, 0, 0, 0, 0, 0, 0, 0, 0, 0}}

extern const constant Scalar29 Scalar29_Zero;
extern const constant Scalar29 Scalar29_L;
extern const constant Scalar29 Scalar29_RR;
extern const constant Scalar29 Scalar29_Zero;
extern const constant Scalar29 Scalar29_L;
extern const constant Scalar29 Scalar29_RR;
extern const constant FieldElement2625 FieldElement2625_EDWARDS_D2;
extern const constant RistrettoPoint RistrettoPoint_IDENTITY;