#pragma once

#include <inttypes.hpp.metal>

class FieldElement2625 {
private:
    u32 _limbs[10];

    FieldElement2625();
public:
    /// Loads the value at grid_tid from an `10 x n` row-major u32 matrix. `n` is the length
    /// of the Scalar array.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    static FieldElement2625 unpack(device const u32* ptr, const size_t grid_tid, const size_t n);
    
    /// Packs this value into an `10 x n` row-major 
    /// u32 matrix.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    void pack(device u32* ptr, size_t grid_tid, size_t n);

    static FieldElement2625 add(FieldElement2625 a, FieldElement2625 b);

    thread const u32& operator[](const size_t i) const thread {
        return _limbs[i];
    }

    thread u32& operator[](const size_t i) thread {
        return _limbs[i];
    }
};