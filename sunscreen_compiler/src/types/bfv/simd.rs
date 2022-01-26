use crate::{
    crate_version,
    types::{
        intern::{Cipher, CircuitNode},
        ops::*,
        BfvType, FheType, NumCiphertexts, TryFromPlaintext, TryIntoPlaintext, Type, TypeName,
        TypeNameInstance, Version,
    },
    with_ctx, CircuitInputTrait, InnerPlaintext, Literal, Params, Plaintext, WithContext,
};
use seal::{
    BFVEncoder, BfvEncryptionParametersBuilder, Context as SealContext, Modulus,
    Result as SealResult,
};
use sunscreen_runtime::{Error as RuntimeError, Result as RuntimeResult};

/**
 * A SIMD vector of signed integers. The vector has 2 rows of `LANES`
 * columns. The `LANES` value must be a power of 2 up to 16384.
 *
 * # Remarks
 * Plaintexts in the BFV scheme are polynomials. When the plaintext
 * modulus is an appropriate prime number, one can decompose the
 * cyclotomic field into ideals using the Chinese remainder theorem.
 * Each ideal is a value independent of the other and forms a SIMD lane.
 *
 * In the BFV scheme using a vector encoding, plaintexts encode as a
 * `2xN/2` matrix, where N is the scheme's polynomial degree.
 * Homomorphic addition, subtraction, and multiplication
 * operate element-wise, thus making the scheme similar to CPU SIMD
 * instructions (e.g. Intel AVX or ARM Neon) with the minor distinction
 * that BFV vector types have 2 rows of values.
 *
 * Unlike CPU vector instructions, which typically feature 4-16 lanes,
 * BFV Simd vectors have thousands of lanes. The LANES values
 * effectively demarks a constraint to the compiler that the polynomial
 * degree must be at least 2*LANES. Should the compiler choose a larger
 * degree for unrelated reasons (e.g. noise budget), the Simd type will
 * automatically repeat the lanes so that rotation operations behave
 * as if you only have `LANES` elements. For example, if `LANES` is
 * 4 (not actually a legal value, but illustrative only!)
 *
 * To combine values across multiple lanes, one can use rotation
 * operations. Unlike a shift, rotation operations cause elements to
 * wrap around rather than truncate. The Simd type exposes these as the
 * `<<`, `>>`, and `swap_rows` operators:
 * * `x << n`, where n is a u64 rotates each row n places to the left.
 * For example, `[0, 1, 2, 3; 4, 5, 6, 7] << 3` yields
 * `[3, 0, 1, 2; 7, 4, 5, 6]` (note that real vectors have many more
 * columns).
 * * `x << n`, where n is a u64 rotates each lane n places to the left.
 * For example, `[0, 1, 2, 3; 4, 5, 6, 7] >> 1` yields `[3, 0, 1, 2; 7, 4, 5, 6]`.
 * * `x.swap_rows()` swaps the rows. For example, `[0, 1, 2, 3; 4, 5, 6, 7].swap_rows()` yields `[4, 5, 6, 7; 0, 1, 2, 3]`.
 *
 * # Performance
 * The BFV scheme is parameterized by a number of values. Generally,
 * the polynomial degree has primacy in determining execution time.
 * A smaller polynomial degree results in a smaller noise budget, but
 * each operation is faster. Additionally, a smaller polynomial degree
 * results in fewer SIMD lanes in a plaintext.
 *
 * To maximally utilize circuit throughput, one should choose a `LANES`
 * value equal to half the polynomial degree needed to accomodate the
 * circuit's noise budget constraint.
 */
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Simd<const LANES: usize> {
    data: [Vec<i64>; 2],
}

impl<const LANES: usize> NumCiphertexts for Simd<LANES> {
    const NUM_CIPHERTEXTS: usize = 1;
}

impl<const LANES: usize> TypeName for Simd<LANES> {
    fn type_name() -> Type {
        Type {
            name: format!("sunscreen_compiler::types::Simd<{}>", LANES),
            version: Version::parse(crate_version!()).expect("Crate version is not a valid semver"),
            is_encrypted: false,
        }
    }
}

impl<const LANES: usize> TypeNameInstance for Simd<LANES> {
    fn type_name_instance(&self) -> Type {
        Self::type_name()
    }
}

impl<const LANES: usize> CircuitInputTrait for Simd<LANES> {}
impl<const LANES: usize> FheType for Simd<LANES> {}
impl<const LANES: usize> BfvType for Simd<LANES> {}

impl<const LANES: usize> TryIntoPlaintext for Simd<LANES> {
    fn try_into_plaintext(
        &self,
        params: &Params,
    ) -> std::result::Result<Plaintext, sunscreen_runtime::Error> {
        if (params.lattice_dimension / 2) as usize % LANES != 0 {
            return Err(RuntimeError::FheTypeError(
                "LANES must be a power two".to_owned(),
            ));
        }

        if 2 * LANES > params.lattice_dimension as usize {
            return Err(RuntimeError::FheTypeError(
                "LANES must be <= polynomial degree / 2".to_owned(),
            ));
        }

        let encryption_params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(params.lattice_dimension)
            .set_plain_modulus(Modulus::new(params.plain_modulus)?)
            .set_coefficient_modulus(
                params
                    .coeff_modulus
                    .iter()
                    .map(|x| Modulus::new(*x))
                    .collect::<SealResult<Vec<Modulus>>>()?,
            )
            .build()?;

        let context = SealContext::new(&encryption_params, false, params.security_level)?;
        let encoder = BFVEncoder::new(&context)?;

        let reps = params.lattice_dimension as usize / (2 * LANES);

        let data = [self.data[0].repeat(reps), self.data[1].repeat(reps)].concat();

        let plaintext = encoder.encode_signed(&data)?;

        Ok(Plaintext {
            data_type: Self::type_name(),
            inner: InnerPlaintext::Seal(vec![WithContext {
                params: params.clone(),
                data: plaintext,
            }]),
        })
    }
}

impl<const LANES: usize> TryFromPlaintext for Simd<LANES> {
    fn try_from_plaintext(
        plaintext: &Plaintext,
        params: &Params,
    ) -> std::result::Result<Self, sunscreen_runtime::Error> {
        let plaintext = plaintext.inner_as_seal_plaintext()?;

        if plaintext.len() != 1 {
            return Err(sunscreen_runtime::Error::FheTypeError(
                "Expected 1 plaintext".to_owned(),
            ));
        }

        if plaintext[0].params != *params {
            return Err(sunscreen_runtime::Error::ParameterMismatch);
        }

        let encryption_params = BfvEncryptionParametersBuilder::new()
            .set_poly_modulus_degree(params.lattice_dimension)
            .set_plain_modulus(Modulus::new(params.plain_modulus)?)
            .set_coefficient_modulus(
                params
                    .coeff_modulus
                    .iter()
                    .map(|x| Modulus::new(*x))
                    .collect::<SealResult<Vec<Modulus>>>()?,
            )
            .build()?;

        let context = SealContext::new(&encryption_params, false, params.security_level)?;
        let encoder = BFVEncoder::new(&context)?;

        let data = encoder.decode_signed(&plaintext[0].data)?;

        let (row_0, row_1) = data.split_at(params.lattice_dimension as usize / 2);

        Ok(Self {
            data: [
                row_0.iter().take(LANES).map(|x| *x).collect(),
                row_1.iter().take(LANES).map(|x| *x).collect(),
            ],
        })
    }
}

impl<const LANES: usize> TryFrom<[Vec<i64>; 2]> for Simd<LANES> {
    type Error = RuntimeError;

    fn try_from(data: [Vec<i64>; 2]) -> RuntimeResult<Self> {
        if data[0].len() != data[1].len() || data[0].len() != LANES {
            return Err(RuntimeError::FheTypeError(
                format!("Invalid SIMD shape. Expected a 2x{} matrix", LANES).to_owned(),
            ));
        }

        Ok(Self { data })
    }
}

impl<const LANES: usize> Into<[Vec<i64>; 2]> for Simd<LANES> {
    fn into(self) -> [Vec<i64>; 2] {
        self.data
    }
}

impl<const LANES: usize> GraphCipherAdd for Simd<LANES> {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_add(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_addition(a.ids[0], b.ids[0]);

            CircuitNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherSub for Simd<LANES> {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_sub(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_subtraction(a.ids[0], b.ids[0]);

            CircuitNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherMul for Simd<LANES> {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_mul(
        a: CircuitNode<Cipher<Self::Left>>,
        b: CircuitNode<Cipher<Self::Right>>,
    ) -> CircuitNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_multiplication(a.ids[0], b.ids[0]);

            CircuitNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherSwapRows for Simd<LANES> {
    fn graph_cipher_swap_rows(x: CircuitNode<Cipher<Self>>) -> CircuitNode<Cipher<Self>> {
        with_ctx(|ctx| {
            let n = ctx.add_swap_rows(x.ids[0]);

            CircuitNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherRotateLeft for Simd<LANES> {
    fn graph_cipher_rotate_left(x: CircuitNode<Cipher<Self>>, y: u64) -> CircuitNode<Cipher<Self>> {
        with_ctx(|ctx| {
            let y = ctx.add_literal(Literal::U64(y));
            let n = ctx.add_rotate_left(x.ids[0], y);

            CircuitNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherRotateRight for Simd<LANES> {
    fn graph_cipher_rotate_right(
        x: CircuitNode<Cipher<Self>>,
        y: u64,
    ) -> CircuitNode<Cipher<Self>> {
        with_ctx(|ctx| {
            let y = ctx.add_literal(Literal::U64(y));
            let n = ctx.add_rotate_right(x.ids[0], y);

            CircuitNode::new(&[n])
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::SchemeType;
    use seal::{CoefficientModulus, PlainModulus, SecurityLevel};

    #[test]
    fn can_roundtrip_encode_simd() {
        let data = [vec![0, 1, 2, 3], vec![4, 5, 6, 7]];

        let params = Params {
            lattice_dimension: 4096,
            plain_modulus: PlainModulus::batching(4096, 16).unwrap().value(),
            coeff_modulus: CoefficientModulus::bfv_default(4096, SecurityLevel::TC128)
                .unwrap()
                .iter()
                .map(|x| x.value())
                .collect::<Vec<u64>>(),
            scheme_type: SchemeType::Bfv,
            security_level: SecurityLevel::TC128,
        };

        let x = Simd::<4>::try_from(data.clone()).unwrap();

        let plaintext = x.try_into_plaintext(&params).unwrap();
        let y = Simd::<4>::try_from_plaintext(&plaintext, &params).unwrap();

        assert_eq!(x, y);
    }
}
