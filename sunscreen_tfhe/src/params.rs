use serde::{Deserialize, Serialize};

use crate::rand::Stddev;
use crate::TorusOps;

use sunscreen_math::security::lwe_std_to_security_level;

trait SecurityLevel {
    fn security_level(&self) -> f64;

    fn assert_security_level(&self, specified_security_level: usize) {
        // Our security level should be within 0.5 bits of the specified
        // security level (so +- 0.25 of the desired level).
        let tolerance = 0.25;

        let security_level = self.security_level();
        let security_difference = (security_level - specified_security_level as f64).abs();

        assert!(
            security_difference <= tolerance,
            "Security level mismatch: expected {}, got {}",
            specified_security_level,
            security_level
        )
    }
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(transparent)]
/// The number of torus elements in the LWE lattice.
pub struct LweDimension(pub usize);

impl LweDimension {
    /// Asserts this LWE problem is well-formed.
    pub fn assert_valid(&self) {
        assert_ne!(self.0, 0);
    }
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(transparent)]
/// The degree of the modulus polynomial `(x^N+1)` in a GLWE instance.
///
/// # Remarks
/// GLWE encryption uses polynomials in `Z_q\[X\]/(X^N + 1)` where N is a power
/// of two.  I.e. negacyclic polynomials modulo (X^N + 1) where the coefficients
/// are integers mod `q`.
pub struct PolynomialDegree(pub usize);

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(transparent)]
/// The number of polynomials in a GLWE instance.
pub struct GlweSize(pub usize);

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(transparent)]
/// The number of plaintext bits to encode into a message.
///
/// # Remarks
/// Packing too much data into messages can result in incorrect decryptions due
/// to noise.
///
/// For binary, set this to one.
pub struct PlaintextBits(pub u32);

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(transparent)]
/// The number of padding bits to include in an LWE ciphertext.
pub struct CarryBits(pub u32);

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(transparent)]
/// The number of digits to decompose a value into.
pub struct RadixCount(pub usize);

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(transparent)]
/// The number of bits in a digit output during base decomposition.
pub struct RadixLog(pub usize);

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(transparent)]
/// The number of [`LweCiphertext`](crate::entities::LweCiphertext)s that get
/// mapped into a [`GlweCiphertext`](crate::entities::GlweCiphertext) during
/// private functional keyswitching.
pub struct PrivateFunctionalKeyswitchLweCount(pub usize);

impl PrivateFunctionalKeyswitchLweCount {
    #[inline(always)]
    /// Assert this [`PrivateFunctionalKeyswitchLweCount`] is valid.
    pub fn assert_valid(&self) {
        assert_ne!(self.0, 0);
    }
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
/// The parameters defining how to do approximately perform base decomposition. I.e.
/// decompose values into digits.
///
/// # Validity
/// For [`RadixDecomposition`] parameters to be valid:
/// * `count` must be greater than zero.
/// * `radix_log` must be greater than zero.
/// * `count * radix_log` must be less than equal to the number of bits in the
/// [`Torus`](crate::Torus) element used in the operation(s) performing radix
/// decomposition.
///
/// Calling [`assert_valid`](Self::assert_valid) will panic if the parameters are invalid.
pub struct RadixDecomposition {
    /// The number of digits to decompose a value into.
    pub count: RadixCount,

    /// The number of bits in a digit output during base decomposition.
    pub radix_log: RadixLog,
}

impl RadixDecomposition {
    #[inline(always)]
    /// Panics if these [`RadixDecomposition`] parameters are invalid.
    pub fn assert_valid<S: TorusOps>(&self) {
        assert!(self.count.0 > 0);
        assert!(self.radix_log.0 > 0);
        assert!(self.count.0 * self.radix_log.0 <= S::BITS as usize);
    }
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
/// A [`PolynomialDegree`] and [`GlweSize`] in a GLWE instance.
pub struct GlweDimension {
    /// The degree of the polynomial in a GLWE instance.
    pub polynomial_degree: PolynomialDegree,

    /// The number of polynomials in a GLWE instance.
    pub size: GlweSize,
}

impl GlweDimension {
    /// Reinterpret this GLWE problem instance as an LWE problem instance, returning
    /// the [`LweDimension`].
    pub fn as_lwe_dimension(&self) -> LweDimension {
        LweDimension(self.polynomial_degree.0 * self.size.0)
    }

    #[inline(always)]
    /// Assert these GLWE parameters are valid.
    pub fn assert_valid(&self) {
        assert!(self.polynomial_degree.0.is_power_of_two());
        assert!(self.polynomial_degree.0 > 0);
        assert!(self.size.0 > 0);
    }
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
/// Parameters that define an LWE problem instance.
///
/// # Security
/// `dim` and `std` must be properly set to attain the desired security level. Improper
/// values will result in an insecure scheme.
pub struct LweDef {
    /// The dimension of the LWE lattice.
    pub dim: LweDimension,

    /// The standard deviation of the noise in the LWE lattice.
    pub std: Stddev,
}

impl LweDef {
    #[inline(always)]
    /// Asserts this LWE problem is well-formed.
    pub fn assert_valid(&self) {
        self.dim.assert_valid();
    }
}

impl SecurityLevel for LweDef {
    fn security_level(&self) -> f64 {
        lwe_std_to_security_level(self.dim.0, self.std.0).unwrap()
    }
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
/// Parameters that define a GLWE problem instance.
///
/// # Security
/// `dim` and `std` must be properly set to attain the desired security level. Improper
/// values will result in an insecure scheme.
pub struct GlweDef {
    /// The dimension of the GLWE instance.
    pub dim: GlweDimension,

    /// The standard deviation of the noise in the GLWE instance.
    pub std: Stddev,
}

impl GlweDef {
    /// Reinterpret this GLWE instance as an LWE instance of the same lattice dimension.
    pub fn as_lwe_def(&self) -> LweDef {
        LweDef {
            dim: self.dim.as_lwe_dimension(),
            std: self.std,
        }
    }

    #[inline(always)]
    /// Assert the GLWE instance is valid.
    pub fn assert_valid(&self) {
        self.dim.assert_valid();
    }
}

impl SecurityLevel for GlweDef {
    fn security_level(&self) -> f64 {
        self.as_lwe_def().security_level()
    }
}

/// 128-bit secure parameters for an LWE instance with a dimension of 512.
pub const LWE_512_128: LweDef = LweDef {
    dim: LweDimension(512),
    std: Stddev(0.0004899836456140595),
};

/// 80-bit secure parameters for a GLWE instance with 5 polynomials of degree 256.
pub const GLWE_5_256_128: GlweDef = GlweDef {
    dim: GlweDimension {
        size: GlweSize(5),
        polynomial_degree: PolynomialDegree(256),
    },
    std: Stddev(5e-10),
};

/// 128-bit secure parameters for a GLWE instance with 1 polynomial of degree 1024.
pub const GLWE_1_1024_128: GlweDef = GlweDef {
    dim: GlweDimension {
        size: GlweSize(1),
        polynomial_degree: PolynomialDegree(1024),
    },
    std: Stddev(0.0000000444778278004718),
};

/// 128-bit secure parameters for a GLWE instance with 1 polynomial of degree 2048.
pub const GLWE_1_2048_128: GlweDef = GlweDef {
    dim: GlweDimension {
        size: GlweSize(1),
        polynomial_degree: PolynomialDegree(2048),
    },
    std: Stddev(0.00000000000000034667670193445625),
};

/// 80-bit secure parameters for an LWE instance with a dimension of 512.
pub const LWE_512_80: LweDef = LweDef {
    dim: LweDimension(512),
    std: Stddev(0.000001842343446823844),
};

/// 80-bit secure parameters for a GLWE instance with 5 polynomials of degree 256.
pub const GLWE_5_256_80: GlweDef = GlweDef {
    dim: GlweDimension {
        size: GlweSize(5),
        polynomial_degree: PolynomialDegree(256),
    },
    std: Stddev(0.0000000000000007794169597948335),
};

/// 80-bit secure parameters for a GLWE instance with 1 polynomial of degree 1024.
pub const GLWE_1_1024_80: GlweDef = GlweDef {
    dim: GlweDimension {
        size: GlweSize(1),
        polynomial_degree: PolynomialDegree(1024),
    },
    std: Stddev(0.0000000000010900242107812643),
};

#[cfg(test)]
mod tests {

    use sunscreen_math::security::lwe_security_level_to_std;

    use super::*;

    #[test]
    fn check_security_levels() {
        let actual_lwe_std = lwe_security_level_to_std(512, 128.0).unwrap();
        println!("LWE 512 128: {}", actual_lwe_std);
        LWE_512_128.assert_security_level(128);

        let actual_glwe_std = lwe_security_level_to_std(1024, 128.0).unwrap();
        println!("GLWE 1 1024 128: {}", actual_glwe_std);
        GLWE_1_1024_128.assert_security_level(128);

        let actual_glwe_std = lwe_security_level_to_std(2048, 128.0).unwrap();
        println!("GLWE 1 2048 128: {}", actual_glwe_std);
        GLWE_1_2048_128.assert_security_level(128);

        let actual_lwe_std = lwe_security_level_to_std(512, 80.0).unwrap();
        println!("LWE 512 80: {}", actual_lwe_std);
        LWE_512_80.assert_security_level(80);

        let actual_glwe_std = lwe_security_level_to_std(256 * 5, 80.0).unwrap();
        println!("GLWE 5 256 80: {}", actual_glwe_std);
        GLWE_5_256_80.assert_security_level(80);

        let actual_glwe_std = lwe_security_level_to_std(1024, 80.0).unwrap();
        println!("GLWE 1 1024 80: {}", actual_glwe_std);
        GLWE_1_1024_80.assert_security_level(80);
    }
}
