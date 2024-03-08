use num::Complex;
use raw_cpuid::CpuId;

#[cfg(target_arch = "x86")]
use core::arch::x86::*;

#[cfg(target_arch = "x86_64")]
use core::arch::x86_64::*;
use std::arch::asm;

use super::scalar;

fn avx_512_available() -> bool {
    if let Some(e) = CpuId::new().get_extended_feature_info() {
        e.has_avx512f()
    } else {
        false
    }
}

#[inline(always)]
pub fn complex_mad(c: &mut [Complex<f64>], a: &[Complex<f64>], b: &[Complex<f64>]) {
    assert_eq!(c.as_ptr().align_offset(core::mem::align_of::<__m512d>()), 0);
    assert_eq!(b.as_ptr().align_offset(core::mem::align_of::<__m512d>()), 0);
    assert_eq!(a.as_ptr().align_offset(core::mem::align_of::<__m512d>()), 0);
    assert_eq!(c.len(), a.len());
    assert_eq!(b.len(), a.len());
    assert_eq!(a.len() % 8, 0);

    if avx_512_available() {
        unsafe { complex_mad_avx_512_unchecked(c, a, b) }
    } else {
        scalar::complex_mad(c, a, b)
    }
}

/// Compute vector `c += a * b` over `&[Complex<f64>]`.
///
/// # Safety
/// c, a, b must be aligned to a 512-bit boundary. The program will otherwise bus error
/// and crash.
///
/// the lengths of c, a, and b must be the equal or UB may result.
/// the lengths of c, a, and b must be a multiple of 8 or UB will result.
#[inline(always)]
unsafe fn complex_mad_avx_512_unchecked(
    c: &mut [Complex<f64>],
    a: &[Complex<f64>],
    b: &[Complex<f64>],
) {
    let mut i = 0;

    let probe = std::mem::MaybeUninit::<__m512d>::uninit();

    // Complex<T> is declared as repr(C), so the location of re and im are guaranteed
    // at address offsets 0 and 8 for Complex<f64>. This allows us to treat
    // &[Complex<f64>] as &[f64] for the below asm snippet.
    let a_ptr = a.as_ptr() as *const f64;
    let b_ptr = b.as_ptr() as *const f64;
    let c_ptr = c.as_ptr() as *mut f64;

    // Each complex is 2 f64 values.
    while i < 2 * c.len() {
        // AVX512 isn't currently available on stable, so write some goddamn assembly
        // code I guess ¯\_(ツ)_/¯
        //
        // This snippet reads 2 vectors of 4 complex numbers from a, b, c and computes
        // stores the complex multiply-add result to c. Thus, it iterates over 16 f64
        // elements from each vector at a time.
        asm!(
            "vmovapd zmm0, [{a_ptr}+8*{i}]",    // Load 2 __m512d of Complex<f64> from a
            "vmovapd [{probe}], zmm0",
            "vmovapd zmm1, [{a_ptr}+8*{i}+64]",
            "vshufpd zmm2, zmm0, zmm1, $0",   // Extract the re(a) into zmm2
            "vshufpd zmm3, zmm0, zmm1, $255", // Extract the im(a) into zmm3
            "vmovapd zmm0, [{b_ptr}+8*{i}]",   // Load 2 __m512d of Complex<f64> from b
            "vmovapd zmm1, [{b_ptr}+8*{i}+64]",
            "vshufpd zmm4, zmm0, zmm1, $0",   // Extract the re(b) into zmm4
            "vshufpd zmm5, zmm0, zmm1, $255", // Extract the im(b) into zmm5
            "vmovapd zmm0, [{c_ptr}+8*{i}]",    // Load 2 __m512d of Complex<f64> from c
            "vmovapd zmm1, [{c_ptr}+8*{i}+64]",
            "vshufpd zmm6, zmm0, zmm1, $0",   // Extract the re(c) into zmm6
            "vshufpd zmm7, zmm0, zmm1, $255", // Extract the im(c) into zmm7
            "vfmadd231pd zmm6, zmm2, zmm4",   // re(c) += re(a) * re(b)
            "vfmadd231pd zmm7, zmm2, zmm5",   // im(c) += re(a) * im(b)
            "vfnmadd231pd zmm6, zmm3, zmm5",  // re(c) -= im(a) * im(b)
            "vfmadd231pd zmm7, zmm3, zmm4",   // im(c) += im(a) * re(b)
            "vshufpd zmm0, zmm6, zmm7, $0",   // Repack the lower 4 Complex<f64>s
            "vshufpd zmm1, zmm6, zmm7, $255", // Repack the upper 4 Complex<f64>s
            "vmovapd [{c_ptr}+8*{i}], zmm0",    // Write the repacked values back.
            "vmovapd [{c_ptr}+8*{i}+64], zmm1", // Write the repacked values back.
            a_ptr = in(reg) a_ptr,
            b_ptr = in(reg) b_ptr,
            c_ptr = in(reg) c_ptr,
            i = in(reg) i,
            probe = in(reg) &probe,
            out("zmm0") _, // Indicate our clobbers
            out("zmm1") _,
            out("zmm2") _,
            out("zmm3") _,
            out("zmm4") _,
            out("zmm5") _,
            out("zmm6") _,
            out("zmm7") _,
        );

        i += 16;
    }
}

#[cfg(test)]
mod tests {
    use aligned_vec::AVec;

    use super::*;

    #[test]
    fn can_scalar_mad_complex_f64_slice() {
        let len = 1024;

        let vals_0 = (0..len).map(|x| x as f64).collect::<Vec<_>>();
        let vals_1 = (len..2 * len).map(|x| x as f64).collect::<Vec<_>>();
        let vals_2 = (2 * len..3 * len).map(|x| x as f64).collect::<Vec<_>>();

        let a =
            AVec::<Complex<f64>>::from_iter(64, vals_0.chunks(2).map(|x| Complex::new(x[0], x[1])));
        let b =
            AVec::<Complex<f64>>::from_iter(64, vals_1.chunks(2).map(|x| Complex::new(x[0], x[1])));
        let mut expected =
            AVec::<Complex<f64>>::from_iter(64, vals_2.chunks(2).map(|x| Complex::new(x[0], x[1])));

        let mut actual = expected.clone();

        complex_mad(&mut actual, &a, &b);
        scalar::complex_mad(&mut expected, &a, &b);

        assert_eq!(expected, actual);
    }
}
