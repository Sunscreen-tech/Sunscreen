#pragma once

#include <inttypes.hpp.metal>

class FieldElement2625 {
private:
    u32 _limbs[10];

    FieldElement2625() { }
public:
    FieldElement2625(constant const u32 limbs[10]): _limbs{limbs[0], limbs[1], limbs[2], limbs[3], limbs[4], limbs[5], limbs[6], limbs[7], limbs[8], limbs[9]} { }

    FieldElement2625(thread const u32 limbs[10]): _limbs{limbs[0], limbs[1], limbs[2], limbs[3], limbs[4], limbs[5], limbs[6], limbs[7], limbs[8], limbs[9]} { }

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

    static FieldElement2625 add(const FieldElement2625 a, const FieldElement2625 b);
    static FieldElement2625 sub(const FieldElement2625 a, const FieldElement2625 b);
    static FieldElement2625 mul(const FieldElement2625 a, const FieldElement2625 b);

    FieldElement2625 operator+(const thread FieldElement2625& rhs) {
        return FieldElement2625::add(*this, rhs);
    }

    FieldElement2625 operator+(const constant FieldElement2625& rhs) {
        return FieldElement2625::add(*this, rhs);
    }

    FieldElement2625 operator-(const thread FieldElement2625& rhs) {
        return FieldElement2625::sub(*this, rhs);
    }

    FieldElement2625 operator*(const thread FieldElement2625& rhs) {
        return FieldElement2625::mul(*this, rhs);
    }

    FieldElement2625 operator*(const constant FieldElement2625& rhs) {
        return FieldElement2625::mul(*this, rhs);
    }

    thread const u32& operator[](const size_t i) const thread {
        return _limbs[i];
    }

    thread u32& operator[](const size_t i) thread {
        return _limbs[i];
    }
};