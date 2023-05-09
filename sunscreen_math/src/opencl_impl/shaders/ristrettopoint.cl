#include <inttypes.h.cl>
#include <field2625.h.cl>
#include <scalar29.h.cl>
#include <constants.h.cl>
#include <ristrettopoint.h.cl>

const constant RistrettoPoint RistrettoPoint_IDENTITY = {
    FieldElement2625_ZERO,
    FieldElement2625_ONE,
    FieldElement2625_ONE,
    FieldElement2625_ZERO
};

const constant ProjectiveNielsPoint ProjectiveNielsPoint_IDENTITY = {
    FieldElement2625_ONE,
    FieldElement2625_ONE,
    FieldElement2625_ONE,
    FieldElement2625_ZERO
};

const constant ProjectivePoint ProjectivePoint_IDENTITY = {
    FieldElement2625_ZERO,
    FieldElement2625_ONE,
    FieldElement2625_ONE 
};

///
/// Field2625 impl
///

///
/// RistrettoPoint impl
///

RistrettoPoint RistrettoPoint_unpack(const global u32* ptr, const size_t grid_tid, const size_t n) {
    FieldElement2625 x = FieldElement2625_unpack(&ptr[00 * n], grid_tid, n);
    FieldElement2625 y = FieldElement2625_unpack(&ptr[10 * n], grid_tid, n);
    FieldElement2625 z = FieldElement2625_unpack(&ptr[20 * n], grid_tid, n);
    FieldElement2625 t = FieldElement2625_unpack(&ptr[30 * n], grid_tid, n);

    RistrettoPoint res = { x, y, z, t };

    return res;
}

void RistrettoPoint_pack(const RistrettoPoint* this, global u32* ptr, size_t grid_tid, size_t n) {
    FieldElement2625_pack(&this->X, &ptr[00 * n], grid_tid, n);
    FieldElement2625_pack(&this->Y, &ptr[10 * n], grid_tid, n);
    FieldElement2625_pack(&this->Z, &ptr[20 * n], grid_tid, n);
    FieldElement2625_pack(&this->T, &ptr[30 * n], grid_tid, n);
}

ProjectiveNielsPoint RistrettoPoint_as_projective_niels(const RistrettoPoint* this) {
    FieldElement2625 y_plus_x = FieldElement2625_add(&this->Y, &this->X);
    FieldElement2625 y_minus_x = FieldElement2625_sub(&this->Y, &this->X);

    FieldElement2625 d2 = FieldElement2625_EDWARDS_D2;
    FieldElement2625 td2 = FieldElement2625_mul(&this->T, &d2);

    ProjectiveNielsPoint result = {
        y_plus_x,
        y_minus_x,
        this->Z,
        td2
    };

    return result;
}

ProjectivePoint RistrettoPoint_as_projective(const RistrettoPoint* this) {
    ProjectivePoint result = {
        this->X,
        this->Y,
        this->Z
    };

    return result;
}

RistrettoPoint RistrettoPoint_add(const RistrettoPoint* lhs, const RistrettoPoint* rhs) {
    ProjectiveNielsPoint rhs_pn = RistrettoPoint_as_projective_niels(rhs);
    CompletedPoint sum = RistrettoPoint_add_projective_niels(lhs, &rhs_pn);

    return CompletedPoint_as_extended(&sum);
}

CompletedPoint RistrettoPoint_add_projective_niels(const RistrettoPoint* lhs, const ProjectiveNielsPoint* rhs) {
    FieldElement2625 Y_plus_X = FieldElement2625_add(&lhs->Y, &lhs->X);
    FieldElement2625 Y_minus_X = FieldElement2625_sub(&lhs->Y, &lhs->X);
    FieldElement2625 PP = FieldElement2625_mul(&Y_plus_X, &rhs->Y_plus_X);
    FieldElement2625 MM = FieldElement2625_mul(&Y_minus_X, &rhs->Y_minus_X);
    FieldElement2625 TT2d = FieldElement2625_mul(&lhs->T, &rhs->T2d);
    FieldElement2625 ZZ = FieldElement2625_mul(&lhs->Z, &rhs->Z);
    FieldElement2625 ZZ2 = FieldElement2625_add(&ZZ, &ZZ);


    CompletedPoint result = {
        FieldElement2625_sub(&PP, &MM),
        FieldElement2625_add(&PP, &MM),
        FieldElement2625_add(&ZZ2, &TT2d),
        FieldElement2625_sub(&ZZ2, &TT2d)
    };

    return result;
}

RistrettoPoint RistrettoPoint_sub(const RistrettoPoint* lhs, const RistrettoPoint* rhs) {
    ProjectiveNielsPoint rhs_pn = RistrettoPoint_as_projective_niels(rhs);
    CompletedPoint sum = RistrettoPoint_sub_projective_niels(lhs, &rhs_pn);

    return CompletedPoint_as_extended(&sum);
}

CompletedPoint RistrettoPoint_sub_projective_niels(const RistrettoPoint* lhs, const ProjectiveNielsPoint* rhs) {
    FieldElement2625 Y_plus_X = FieldElement2625_add(&lhs->Y, &lhs->X);
    FieldElement2625 Y_minus_X = FieldElement2625_sub(&lhs->Y, &lhs->X);
    FieldElement2625 PM = FieldElement2625_mul(&Y_plus_X, &rhs->Y_minus_X);
    FieldElement2625 MP = FieldElement2625_mul(&Y_minus_X, &rhs->Y_plus_X);
    FieldElement2625 TT2d = FieldElement2625_mul(&lhs->T, &rhs->T2d);
    FieldElement2625 ZZ = FieldElement2625_mul(&lhs->Z, &rhs->Z);
    FieldElement2625 ZZ2 = FieldElement2625_add(&ZZ, &ZZ);

    CompletedPoint result = {
        FieldElement2625_sub(&PM, &MP),
        FieldElement2625_add(&PM, &MP),
        FieldElement2625_sub(&ZZ2, &TT2d),
        FieldElement2625_add(&ZZ2, &TT2d)
    };

    return result;
}
RistrettoPoint RistrettoPoint_scalar_mul(const RistrettoPoint* lhs, const Scalar29* rhs) {
    // A lookup table for Radix-8 multiplication. Contains [0P, 1P, 2P, ...]
    LookupTable8 lut = LookupTable8_init(lhs);

    Radix16 scalar_digits = Scalar29_as_radix_16(rhs);

    // Copy from contant to thread storage. We'll also use this to store the 16P value in standard
    // projection.
    RistrettoPoint tmp2 = RistrettoPoint_IDENTITY;

    ProjectiveNielsPoint lut_val = LookupTable8_select(&lut, scalar_digits.data[63]);

    // Compute the highest nibble scalar's contribution
    CompletedPoint sum = RistrettoPoint_add_projective_niels(&tmp2, &lut_val);
    ProjectivePoint tmp = ProjectivePoint_IDENTITY;

    for (size_t i = 0; i < 63; i++) {
        size_t j = 62 - i;

        tmp = CompletedPoint_as_projective(&sum);
        sum = ProjectivePoint_double_point(&tmp);
        tmp = CompletedPoint_as_projective(&sum);
        sum = ProjectivePoint_double_point(&tmp);
        tmp = CompletedPoint_as_projective(&sum);
        sum = ProjectivePoint_double_point(&tmp);
        tmp = CompletedPoint_as_projective(&sum);
        sum = ProjectivePoint_double_point(&tmp);
        tmp2 = CompletedPoint_as_extended(&sum);

        lut_val = LookupTable8_select(&lut, scalar_digits.data[j]);

        sum = RistrettoPoint_add_projective_niels(&tmp2, &lut_val);
    }

    return CompletedPoint_as_extended(&sum);
}

///
/// ProjectiveNielsPoint impl
///
ProjectiveNielsPoint ProjectiveNielsPoint_neg(const ProjectiveNielsPoint* this) {
    ProjectiveNielsPoint ret = {
        this->Y_minus_X,
        this->Y_plus_X,
        this->Z,
        FieldElement2625_neg(&this->T2d)
    };

    return ret;
}

///
/// ProjectivePoint impl
///
CompletedPoint ProjectivePoint_double_point(const ProjectivePoint* this) {
    FieldElement2625 XX = FieldElement2625_square(&this->X);
    FieldElement2625 YY = FieldElement2625_square(&this->Y);;
    FieldElement2625 ZZ2 = FieldElement2625_square2(&this->Z);
    FieldElement2625 X_plus_Y = FieldElement2625_add(&this->X, &this->Y);
    FieldElement2625 X_plus_Y_sq = FieldElement2625_square(&X_plus_Y);
    FieldElement2625 YY_plus_XX = FieldElement2625_add(&YY, &XX);
    FieldElement2625 YY_minus_XX = FieldElement2625_sub(&YY, &XX);

    CompletedPoint ret = {
        FieldElement2625_sub(&X_plus_Y_sq, &YY_plus_XX),
        YY_plus_XX,
        YY_minus_XX,
        FieldElement2625_sub(&ZZ2, &YY_minus_XX)
    };

    return ret;
}

RistrettoPoint ProjectivePoint_as_extended(const ProjectivePoint* this) {
    FieldElement2625 X = FieldElement2625_mul(&this->X, &this->Z);
    FieldElement2625 Y = FieldElement2625_mul(&this->Y, &this->Z);
    FieldElement2625 Z = FieldElement2625_square(&this->Z);
    FieldElement2625 T = FieldElement2625_mul(&this->X, &this->Y);

    RistrettoPoint ret = {
        X,
        Y,
        Z,
        T
    };

    return ret;
}

///
/// CompletedPoint impl
///

RistrettoPoint CompletedPoint_as_extended(const CompletedPoint* this) {
    FieldElement2625 X = FieldElement2625_mul(&this->X, &this->T);
    FieldElement2625 Y = FieldElement2625_mul(&this->Y, &this->Z);
    FieldElement2625 Z = FieldElement2625_mul(&this->Z, &this->T);
    FieldElement2625 T = FieldElement2625_mul(&this->X, &this->Y);

    RistrettoPoint result = {
        X,
        Y,
        Z,
        T
    };

    return result;
}

ProjectivePoint CompletedPoint_as_projective(const CompletedPoint* this) {
    FieldElement2625 X = FieldElement2625_mul(&this->X, &this->T);
    FieldElement2625 Y = FieldElement2625_mul(&this->Y, &this->Z);
    FieldElement2625 Z = FieldElement2625_mul(&this->Z, &this->T);

    ProjectivePoint result = { X, Y, Z };

    return result;
}

///
/// LookupTable8 impl
///
LookupTable8 LookupTable8_init(const RistrettoPoint* p) {
    LookupTable8 table;

    table.entries[0] = RistrettoPoint_as_projective_niels(p);

    for (size_t i = 1; i < 8; i++) {
        CompletedPoint s = RistrettoPoint_add_projective_niels(p, &table.entries[i - 1]);
        RistrettoPoint s_r = CompletedPoint_as_extended(&s);
        ProjectiveNielsPoint s_p = RistrettoPoint_as_projective_niels(&s_r);

        table.entries[i] = s_p;
    }

    return table;
}

const ProjectiveNielsPoint LookupTable8_select(const LookupTable8* lut, i8 x) {
    ProjectiveNielsPoint ret = ProjectiveNielsPoint_IDENTITY;
    size_t idx = abs(x);

    ret = x > 0 ? lut->entries[idx - 1] : ret;
    ret = x < 0 ? ProjectiveNielsPoint_neg(&lut->entries[idx - 1]) : ret;

    return ret;
}

///
/// Kernels
///

kernel void ristretto_add(
    global const u32* a,
    global const u32* b,
    global u32* c,
    u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        RistrettoPoint t_a = RistrettoPoint_unpack(a, tid, len);
        RistrettoPoint t_b = RistrettoPoint_unpack(b, tid, len);
        RistrettoPoint t_c = RistrettoPoint_add(&t_a, &t_b);
        
        RistrettoPoint_pack(&t_c, c, tid, len);
    }
}

kernel void ristretto_sub(
    global const u32* a,
    global const u32* b,
    global u32* c,
    u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        RistrettoPoint t_a = RistrettoPoint_unpack(a, tid, len);
        RistrettoPoint t_b = RistrettoPoint_unpack(b, tid, len);
        RistrettoPoint t_c = RistrettoPoint_sub(&t_a, &t_b);
        
        RistrettoPoint_pack(&t_c, c, tid, len);
    }
}

kernel void ristretto_scalar_mul(
    global const u32* a,
    global const u32* b,
    global u32* c,
    u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        RistrettoPoint t_a = RistrettoPoint_unpack(a, tid, len);
        Scalar29 t_b = Scalar29_unpack(b, tid, len);
        RistrettoPoint t_c = RistrettoPoint_scalar_mul(&t_a, &t_b);
        
        RistrettoPoint_pack(&t_c, c, tid, len);
    }
}

///
/// TESTS
///

#if defined(TEST)

kernel void basic_kernel(
    global const u32* a,
    global const u32* b,
    global u32* c,
    const u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        c[tid] = a[tid] + b[tid];
    }
}

kernel void test_can_pack_unpack_scalar(
    global const u32* a,
    global u32* b,
    const u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        Scalar29 val = Scalar29_unpack(a, tid, len);
        Scalar29_pack(&val, b, tid, len);
    }
}

kernel void test_can_roundtrip_montgomery(
    global const u32* a,
    global u32* b,
    const u32 len 
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        Scalar29 x = Scalar29_unpack(a, tid, len);
        Scalar29 x_mont = Scalar29_to_montgomery(&x);
        Scalar29 y = Scalar29_from_montgomery(&x_mont);

        Scalar29_pack(&y, b, tid, len);
    }
}

kernel void test_can_pack_unpack_ristretto(
    global const u32* a,
    global u32* b,
    const u32 len 
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        RistrettoPoint val = RistrettoPoint_unpack(a, tid, len);
        RistrettoPoint_pack(&val, b, tid, len);
    }
}

kernel void test_can_roundtrip_projective_point(
    global const u32* a,
    global u32* b,
    const u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        RistrettoPoint x = RistrettoPoint_unpack(a, tid, len);
        ProjectivePoint x_p = RistrettoPoint_as_projective(&x);
        RistrettoPoint x_e = ProjectivePoint_as_extended(&x_p);

        RistrettoPoint_pack(&x_e, b, tid, len);
    }
}

kernel void test_can_double_projective_point(
    global const u32* a,
    global u32* b,
    const u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        RistrettoPoint x = RistrettoPoint_unpack(a, tid, len);
        ProjectivePoint x_p = RistrettoPoint_as_projective(&x);
        CompletedPoint x_p_2 = ProjectivePoint_double_point(&x_p);
        RistrettoPoint y = CompletedPoint_as_extended(&x_p_2);

        RistrettoPoint_pack(&y, b, tid, len);
    }
}

kernel void test_can_pack_unpack_field2625(
    global const u32* a,
    global u32* b,
    const u32 len
) {
    u32 tid = get_global_id(0);

    if (tid < len) {
        FieldElement2625 x = FieldElement2625_unpack(a, tid, len);
        FieldElement2625_pack(&x, b, tid, len);
    }
}

#endif
