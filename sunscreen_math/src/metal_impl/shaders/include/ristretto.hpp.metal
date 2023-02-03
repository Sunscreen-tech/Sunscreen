#pragma once

#include <inttypes.hpp.metal>
#include <field.hpp.metal>

class ProjectiveNielsPoint;

class RistrettoPoint {
private:
    FieldElement2625 x;
    FieldElement2625 y;
    FieldElement2625 z;
    FieldElement2625 t;

    RistrettoPoint(FieldElement2625 x, FieldElement2625 y, FieldElement2625 z, FieldElement2625 t)
        : x(x), y(y), z(z), t(t) {}

public:
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
    ProjectiveNielsPoint as_projective_niels();

};

class ProjectiveNielsPoint {
private:
    FieldElement2625 x;
    FieldElement2625 y;
    FieldElement2625 z;
    FieldElement2625 t;

public:
    ProjectiveNielsPoint(FieldElement2625 x, FieldElement2625 y, FieldElement2625 z, FieldElement2625 t)
        : x(x), y(y), z(z), t(t) {}
};