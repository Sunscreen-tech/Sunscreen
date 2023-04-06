#pragma once

#include <inttypes.hpp.cu>
#include <field.hpp.cu>
#include <scalar.hpp.cu>

class ProjectiveNielsPoint;
class CompletedPoint;
class ProjectivePoint;

class RistrettoPoint {
    friend ProjectiveNielsPoint;
    friend CompletedPoint;

private:
    FieldElement2625 X;
    FieldElement2625 Y;
    FieldElement2625 Z;
    FieldElement2625 T;

public:
    __device__ RistrettoPoint(FieldElement2625 x, FieldElement2625 y, FieldElement2625 z, FieldElement2625 t)
        : X(x), Y(y), Z(z), T(t) {}

    __device__ static RistrettoPoint IDENTITY() {
        return RistrettoPoint(
            FieldElement2625::ZERO(),
            FieldElement2625::ONE(),
            FieldElement2625::ONE(),
            FieldElement2625::ZERO()
        );
    }

    /// Loads the value at grid_tid from an `40 x n` row-major u32 matrix. `n` is the length
    /// of the Scalar array.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    __device__ static RistrettoPoint unpack(const u32* ptr, const size_t grid_tid, const size_t n);
    
    /// Packs this value into an `40 x n` row-major 
    /// u32 matrix.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    __device__ void pack(u32* ptr, size_t grid_tid, size_t n);

    /// Convert to a ProjectiveNielsPoint
    __device__ ProjectiveNielsPoint as_projective_niels() const;
    __device__ ProjectivePoint as_projective() const;

    __device__ RistrettoPoint operator+(const RistrettoPoint& rhs) const;
    __device__ CompletedPoint operator+(const ProjectiveNielsPoint& rhs) const;
    __device__ RistrettoPoint operator-(const RistrettoPoint& rhs) const;
    __device__ CompletedPoint operator-(const ProjectiveNielsPoint& rhs) const;
    __device__ RistrettoPoint operator*(const Scalar29& rhs) const;

    __device__ static RistrettoPoint scalar_mul(const RistrettoPoint& lhs, const Scalar29& rhs);
};

class ProjectiveNielsPoint {
    friend RistrettoPoint;
private:
    FieldElement2625 Y_plus_X;
    FieldElement2625 Y_minus_X;
    FieldElement2625 Z;
    FieldElement2625 T2d;

public:
    __device__ static ProjectiveNielsPoint IDENTITY() {
        return ProjectiveNielsPoint(
            FieldElement2625::ONE(),
            FieldElement2625::ONE(),
            FieldElement2625::ONE(),
            FieldElement2625::ZERO()
        );
    }

    __device__ ProjectiveNielsPoint() { };

    __device__ ProjectiveNielsPoint(FieldElement2625 x, FieldElement2625 y, FieldElement2625 z, FieldElement2625 t)
        : Y_plus_X(x), Y_minus_X(y), Z(z), T2d(t) {}

    __device__ FieldElement2625 get_y_plus_x() { return Y_plus_X; }
    __device__ FieldElement2625 get_y_minus_x() { return Y_minus_X; }
    __device__ FieldElement2625 get_z() { return Z; }
    __device__ FieldElement2625 get_t2d() { return T2d; }

    __device__ ProjectiveNielsPoint operator-() const;
};

class CompletedPoint {
    friend RistrettoPoint;
private:
    FieldElement2625 X;
    FieldElement2625 Y;
    FieldElement2625 Z;
    FieldElement2625 T;

public:
    __device__ CompletedPoint(FieldElement2625 x, FieldElement2625 y, FieldElement2625 z, FieldElement2625 t)
        : X(x), Y(y), Z(z), T(t) {}

    __device__ RistrettoPoint as_extended() const;
    __device__ ProjectivePoint as_projective() const;

    __device__ FieldElement2625 get_x() { return X; }
    __device__ FieldElement2625 get_y() { return Y; }
    __device__ FieldElement2625 get_z() { return Z; }
    __device__ FieldElement2625 get_t() { return T; }
};

class ProjectivePoint {
private:
    FieldElement2625 X;
    FieldElement2625 Y;
    FieldElement2625 Z;

public:
    __device__ static ProjectivePoint IDENTITY() {
        return ProjectivePoint(
            FieldElement2625::ZERO(),
            FieldElement2625::ONE(),
            FieldElement2625::ONE()
        );
    };

    __device__ ProjectivePoint(FieldElement2625 x, FieldElement2625 y, FieldElement2625 z): X(x), Y(y), Z(z) {}

    // double is a keyword, so we name our function double_point.
    __device__ CompletedPoint double_point() const;

    __device__ RistrettoPoint as_extended() const;
};