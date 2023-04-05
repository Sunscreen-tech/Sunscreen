#pragma once

#include <inttypes.hpp.cu>

class Radix16 {
private:
    i8 data[64];

public:
    __device__ i8& operator[](size_t i) {
        return data[i];
    }

    __device__ const i8& operator[](size_t i) const {
        return data[i];
    }
};

class Scalar29 {
private:
    u32 _limbs[9];

    __device__ Scalar29 montgomery_invert() const;

public:
    Scalar29() = delete;

    __device__ Scalar29(const u32 limbs[9]): _limbs{limbs[0], limbs[1], limbs[2], limbs[3], limbs[4], limbs[5], limbs[6], limbs[7], limbs[8]} {}

    __device__ constexpr static Scalar29 Zero() {
        const u32 _Scalar29_Zero[] = {0, 0, 0, 0, 0, 0, 0, 0, 0};

        return Scalar29(_Scalar29_Zero);
    }

    /// Loads the value at grid_tid from an `8 x n` row-major u32 matrix. `n` is the length
    /// of the Scalar array.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    __device__ static Scalar29 unpack(const u32* ptr, size_t grid_tid, size_t n);
    
    /// Packs this value into an `8 x n` row-major 
    /// u32 matrix.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    __device__ void pack(u32* ptr, size_t grid_tid, size_t n);
    
    __device__ static Scalar29 add(const Scalar29 a, const Scalar29 b);
    __device__ static Scalar29 sub(const Scalar29 a, const Scalar29 b);
    __device__ static Scalar29 mul(const Scalar29 a, const Scalar29 b);
    __device__ static Scalar29 square(const Scalar29 a);

    __device__ Scalar29 operator=(const Scalar29& rhs) volatile {
        *this = rhs;
    }

    __device__ Scalar29 operator+(const Scalar29& other) const {
        return Scalar29::add(*this, other);
    }

    __device__ Scalar29 operator-(const Scalar29& other) const {
        return Scalar29::sub(*this, other);
    }

    __device__ Scalar29 operator*(const Scalar29& other) const {
        return Scalar29::mul(*this, other);
    }

    __device__ Scalar29 operator-() const;

    __device__ Scalar29 invert() const;

    __device__ Scalar29 square() const {
        return square(*this);
    }

    __device__ const u32& operator[](const size_t index) const {
        return _limbs[index];
    }

    __device__ u32& operator[](const size_t index) {
        return _limbs[index];
    }

    __device__ Radix16 as_radix_16() const;
};
