#pragma once

#include <inttypes.hpp.metal>
#include <field.hpp.metal>
#include <scalar.hpp.metal>

class ProjectiveNielsPoint;
class CompletedPoint;

class RistrettoPoint {
    friend ProjectiveNielsPoint;
    friend CompletedPoint;

private:
    FieldElement2625 X;
    FieldElement2625 Y;
    FieldElement2625 Z;
    FieldElement2625 T;

public:
    RistrettoPoint(FieldElement2625 x, FieldElement2625 y, FieldElement2625 z, FieldElement2625 t)
        : X(x), Y(y), Z(z), T(t) {}

    static const constant RistrettoPoint IDENTITY;

    /// Loads the value at grid_tid from an `40 x n` row-major u32 matrix. `n` is the length
    /// of the Scalar array.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    static RistrettoPoint unpack(device const u32* ptr, const size_t grid_tid, const size_t n);
    
    /// Packs this value into an `40 x n` row-major 
    /// u32 matrix.
    ///
    /// # Remarks
    /// Each thread should pass the same base address.
    ///
    /// When reach thread in a group executes this
    /// function with a consecutive grid_tid,
    /// unpacking is fully coalesced.
    void pack(device u32* ptr, size_t grid_tid, size_t n);

    /// Convert to a ProjectiveNielsPoint
    ProjectiveNielsPoint as_projective_niels() const;

    RistrettoPoint operator+(const thread RistrettoPoint& rhs) const thread;
    CompletedPoint operator+(const thread ProjectiveNielsPoint& rhs) const thread;
    RistrettoPoint operator-(const thread RistrettoPoint& rhs) const thread;
    CompletedPoint operator-(const thread ProjectiveNielsPoint& rhs) const thread;
    RistrettoPoint operator*(const thread Scalar29& rhs) const thread;

    static RistrettoPoint scalar_mul(const RistrettoPoint lhs, const Scalar29 rhs);
};

class ProjectiveNielsPoint {
    friend RistrettoPoint;
private:
    FieldElement2625 Y_plus_X;
    FieldElement2625 Y_minus_X;
    FieldElement2625 Z;
    FieldElement2625 T2d;

public:
    ProjectiveNielsPoint(FieldElement2625 x, FieldElement2625 y, FieldElement2625 z, FieldElement2625 t)
        : Y_plus_X(x), Y_minus_X(y), Z(z), T2d(t) {}

    FieldElement2625 get_y_plus_x() { return Y_plus_X; }
    FieldElement2625 get_y_minus_x() { return Y_minus_X; }
    FieldElement2625 get_z() { return Z; }
    FieldElement2625 get_t2d() { return T2d; }
};

class CompletedPoint {
    friend RistrettoPoint;
private:
    FieldElement2625 X;
    FieldElement2625 Y;
    FieldElement2625 Z;
    FieldElement2625 T;

public:
    CompletedPoint(FieldElement2625 x, FieldElement2625 y, FieldElement2625 z, FieldElement2625 t)
        : X(x), Y(y), Z(z), T(t) {}

    RistrettoPoint as_extended() const;

    FieldElement2625 get_x() { return X; }
    FieldElement2625 get_y() { return Y; }
    FieldElement2625 get_z() { return Z; }
    FieldElement2625 get_t() { return T; }
};
