#pragma once

#include <inttypes.hpp.cu>

struct u64_10 {
    u64 data[10];

    __device__ inline u64& operator[](const size_t i) {
        return data[i];
    }
    __device__ inline const u64& operator[](const size_t i) const {
        return data[i];
    }
};

class FieldElement2625 {
private:
    u32 _limbs[10];

    __device__ u64_10 square_inner() const;

public:
    __device__ FieldElement2625() { }

    __device__ static FieldElement2625 ONE() {
        const u32 _ONE[10] = {1, 0, 0, 0, 0, 0, 0, 0, 0, 0};

        return FieldElement2625(_ONE);
    }

    __device__ static const FieldElement2625 ZERO() {
        const u32 _ZERO[10] = {0, 0, 0, 0, 0, 0, 0, 0, 0, 0};

        return FieldElement2625(_ZERO);
    }

    __device__ FieldElement2625(const u32 limbs[10]): _limbs{limbs[0], limbs[1], limbs[2], limbs[3], limbs[4], limbs[5], limbs[6], limbs[7], limbs[8], limbs[9]} { }

    /// Loads the value at grid_tid from an `10 x n` row-major u32 matrix. `n` is the length
    /// of the Scalar array.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    __device__ static FieldElement2625 unpack(const u32* ptr, const size_t grid_tid, const size_t n);
    
    /// Packs this value into an `10 x n` row-major 
    /// u32 matrix.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    __device__ void pack(u32* ptr, size_t grid_tid, size_t n);

    __device__ FieldElement2625 operator+(const FieldElement2625& rhs) const;
    __device__ FieldElement2625 operator-(const FieldElement2625& rhs) const;
    __device__ FieldElement2625 operator*(const FieldElement2625& rhs) const;

    __device__ FieldElement2625 operator-() const;

    /// Compute `this^2`.
    __device__ FieldElement2625 square() const;

    /// Compute `2*this^2`.
    __device__ FieldElement2625 square2() const;

    __device__ inline const u32& operator[](const size_t i) const {
        return _limbs[i];
    }

    __device__ inline u32& operator[](const size_t i) {
        return _limbs[i];
    }
};