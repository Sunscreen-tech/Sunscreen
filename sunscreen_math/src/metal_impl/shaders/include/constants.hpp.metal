#pragma once

#include <inttypes.hpp.metal>
#include <scalar.hpp.metal>
#include <field.hpp.metal>

namespace constants {
    constant const u32 _L[9] = {
        0x1cf5d3ed, 0x009318d2, 0x1de73596, 0x1df3bd45, 0x0000014d, 0x00000000, 0x00000000, 0x00000000,
        0x00100000,
    };

    /// `L` is the order of base point, i.e. 2^252 +
    /// 27742317777372353535851937790883648493
    constant const Scalar29 L(_L);
    
    /// `L` * `LFACTOR` = -1 (mod 2^29)
    constant const u32 LFACTOR = 0x12547e1b;

    constant const u32 _RR[9] = {
        0x0b5f9d12, 0x1e141b17, 0x158d7f3d, 0x143f3757, 0x1972d781, 0x042feb7c, 0x1ceec73d, 0x1e184d1e,
        0x0005046d
    };
    
    constant const Scalar29 RR = Scalar29(_RR);

    constant const u32 _EDWARDS_D2[10] = {
        45281625, 27714825, 36363642, 13898781, 229458, 15978800, 54557047, 27058993, 29715967, 9444199,
    };

    /// Edwards `2*d` value, equal to `2*(-121665/121666) mod p`.
    constant const FieldElement2625 EDWARDS_D2(_EDWARDS_D2);
}