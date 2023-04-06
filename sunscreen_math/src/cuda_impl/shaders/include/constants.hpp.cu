#pragma once

#include <inttypes.hpp.cu>
#include <scalar.hpp.cu>
#include <field.hpp.cu>

namespace constants {
    /// `L` is the order of base point, i.e. 2^252 +
    /// 27742317777372353535851937790883648493
    __device__ Scalar29 L();
    
    /// `L` * `LFACTOR` = -1 (mod 2^29)
    __device__ const u32 LFACTOR = 0x12547e1b;
    
    __device__ Scalar29 RR();

    /// Edwards `2*d` value, equal to `2*(-121665/121666) mod p`.
    __device__ FieldElement2625 EDWARDS_D2();
}