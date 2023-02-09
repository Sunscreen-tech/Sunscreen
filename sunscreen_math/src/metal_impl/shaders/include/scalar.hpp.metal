#pragma once

#include <inttypes.hpp.metal>

class Radix16 {
private:
    i8 data[64];

public:
    thread i8& operator[](size_t i) {
        return data[i];
    }

    const thread i8& operator[](size_t i) const {
        return data[i];
    }
};

class Scalar29 {
private:
    u32 _limbs[9];

public:
    constant static Scalar29 Zero;

    Scalar29() = delete;

    Scalar29(thread u32 limbs[9]): _limbs{limbs[0], limbs[1], limbs[2], limbs[3], limbs[4], limbs[5], limbs[6], limbs[7], limbs[8]} {}

    Scalar29(constant u32 limbs[9]): _limbs{limbs[0], limbs[1], limbs[2], limbs[3], limbs[4], limbs[5], limbs[6], limbs[7], limbs[8]} {}

    /// Loads the value at grid_tid from an `8 x n` row-major u32 matrix. `n` is the length
    /// of the Scalar array.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    static Scalar29 unpack(device const u32* ptr, size_t grid_tid, size_t n);
    
    /// Packs this value into an `8 x n` row-major 
    /// u32 matrix.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    void pack(device u32* ptr, size_t grid_tid, size_t n);
    
    static Scalar29 add(const Scalar29 a, const Scalar29 b);
    static Scalar29 sub(const Scalar29 a, const Scalar29 b);
    static Scalar29 mul(const Scalar29 a, const Scalar29 b);
    static Scalar29 square(const Scalar29 a);

    Scalar29 operator+(thread const Scalar29& other) thread {
        return Scalar29::add(*this, other);
    }

    Scalar29 operator-(thread const Scalar29& other) thread {
        return Scalar29::sub(*this, other);
    }

    Scalar29 operator*(thread const Scalar29& other) thread {
        return Scalar29::mul(*this, other);
    }

    Scalar29 operator-() {
        return Scalar29::sub(Zero, *this);
    }

    Scalar29 square() thread {
        return square(*this);
    }

    const thread u32& operator[](const size_t index) const {
        return _limbs[index];
    }

    thread u32& operator[](const size_t index) {
        return _limbs[index];
    }

    const constant thread u32& operator[](const size_t index) constant const {
        return _limbs[index];
    }

    Radix16 as_radix_16() const;
};
