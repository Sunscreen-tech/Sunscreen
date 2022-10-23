use crate::{
    types::{
        intern::{Cipher, FheProgramNode},
        ops::*,
        BfvType, FheType, LaneCount, NumCiphertexts, SwapRows, TryFromPlaintext, TryIntoPlaintext,
        Type, TypeName, TypeNameInstance, Version,
    },
    with_ctx, FheProgramInputTrait, InnerPlaintext, Literal, Params, Plaintext, WithContext,
};
use seal_fhe::{
    BFVEncoder, BfvEncryptionParametersBuilder, Context as SealContext, Modulus,
    Result as SealResult,
};
use std::ops::*;
use sunscreen_runtime::{Error as RuntimeError, Result as RuntimeResult};

/**
 * A Batched vector of signed integers. The vector has 2 rows of `LANES`
 * columns. The `LANES` value must be a power of 2 up to 16384.
 *
 * # Remarks
 * Plaintexts in the BFV scheme are polynomials. When the plaintext
 * modulus is an appropriate prime number, one can decompose the
 * cyclotomic field into ideals using the Chinese remainder theorem.
 * Each ideal is a value independent of the other and forms a Batched lane.
 *
 * In the BFV scheme using a vector encoding, plaintexts encode as a
 * `2xN/2` matrix, where N is the scheme's polynomial degree.
 * Homomorphic addition, subtraction, and multiplication
 * operate element-wise, thus making the scheme similar to CPU Batched
 * instructions (e.g. Intel AVX or ARM Neon) with the minor distinction
 * that BFV vector types have 2 rows of values.
 *
 * Unlike CPU vector instructions, which typically feature 4-16 lanes,
 * BFV Batched vectors have thousands of lanes. The LANES values
 * effectively demarks a constraint to the compiler that the polynomial
 * degree must be at least 2*LANES. Should the compiler choose a larger
 * degree for unrelated reasons (e.g. noise budget), the Batched type will
 * automatically repeat the lanes so that rotation operations behave
 * as if you only have `LANES` elements. For example, if `LANES` is
 * 4 (not actually a legal value, but illustrative only!)
 *
 * To combine values across multiple lanes, one can use rotation
 * operations. Unlike a shift, rotation operations cause elements to
 * wrap around rather than truncate. The Batched type exposes these as the
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
 * results in fewer Batched lanes in a plaintext.
 *
 * To maximally utilize FHE program throughput, one should choose a `LANES`
 * value equal to half the polynomial degree needed to accomodate the
 * FHE program's noise budget constraint.
 */
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Batched<const LANES: usize> {
    data: [[i64; LANES]; 2],
}

impl<const LANES: usize> NumCiphertexts for Batched<LANES> {
    const NUM_CIPHERTEXTS: usize = 1;
}

impl<const LANES: usize> TypeName for Batched<LANES> {
    fn type_name() -> Type {
        let version = env!("CARGO_PKG_VERSION");

        Type {
            name: format!("sunscreen::types::Batched<{}>", LANES),
            version: Version::parse(version).expect("Crate version is not a valid semver"),
            is_encrypted: false,
        }
    }
}

impl<const LANES: usize> TypeNameInstance for Batched<LANES> {
    fn type_name_instance(&self) -> Type {
        Self::type_name()
    }
}

impl<const LANES: usize> FheProgramInputTrait for Batched<LANES> {}
impl<const LANES: usize> FheType for Batched<LANES> {}
impl<const LANES: usize> BfvType for Batched<LANES> {}

impl<const LANES: usize> std::fmt::Display for Batched<LANES> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let prefix = "[[";
        let middle = "], [";
        let suffix = "]]";

        let chars_remaining = f.width().unwrap_or(usize::MAX);
        let chars_per_row = usize::max(
            usize::saturating_sub(
                chars_remaining / 2,
                prefix.len() + middle.len() + suffix.len(),
            ),
            2,
        );

        if chars_remaining > "[[..], [..]]".len() {
            write!(f, "{}", prefix)?;

            for i in 0..self.data.len() {
                let mut row_chars = chars_per_row;

                for (j, val) in self.data[i].iter().enumerate() {
                    let val = if j < self.data[i].len() {
                        format!("{}, ", val)
                    } else {
                        format!("{}", val)
                    };

                    if val.len() > row_chars + 2 {
                        write!(f, "..",)?;
                        break;
                    } else {
                        write!(f, "{}", val)?;
                    }

                    row_chars -= val.len();
                }

                if i == 0 {
                    write!(f, "{}", middle)?;
                } else {
                    write!(f, "{}", suffix)?;
                }
            }

            Ok(())
        } else if chars_remaining >= "[..]".len() {
            write!(f, "[..]")
        } else {
            write!(f, "")
        }
    }
}

impl<const LANES: usize> TryIntoPlaintext for Batched<LANES> {
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

impl<const LANES: usize> TryFromPlaintext for Batched<LANES> {
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
                row_0
                    .iter()
                    .take(LANES)
                    .copied()
                    .collect::<Vec<i64>>()
                    .try_into()
                    .map_err(|_| {
                        RuntimeError::FheTypeError(format!(
                            "Failed to convert Vec to [i64;{}]",
                            LANES
                        ))
                    })?,
                row_1
                    .iter()
                    .take(LANES)
                    .copied()
                    .collect::<Vec<i64>>()
                    .try_into()
                    .map_err(|_| {
                        RuntimeError::FheTypeError(format!(
                            "Failed to convert Vec to [i64;{}]",
                            LANES
                        ))
                    })?,
            ],
        })
    }
}

impl<const LANES: usize> TryFrom<[Vec<i64>; 2]> for Batched<LANES> {
    type Error = RuntimeError;

    fn try_from(data: [Vec<i64>; 2]) -> RuntimeResult<Self> {
        Ok(Self {
            data: [
                data[0].clone().try_into().map_err(|_| {
                    RuntimeError::FheTypeError(format!("Failed to convert Vec to [i64;{}]", LANES))
                })?,
                data[1].clone().try_into().map_err(|_| {
                    RuntimeError::FheTypeError(format!("Failed to convert Vec to [i64;{}]", LANES))
                })?,
            ],
        })
    }
}

impl<const LANES: usize> From<Batched<LANES>> for [Vec<i64>; 2] {
    fn from(val: Batched<LANES>) -> Self {
        [val.data[0].into(), val.data[1].into()]
    }
}

impl<const LANES: usize> From<[[i64; LANES]; 2]> for Batched<LANES> {
    fn from(data: [[i64; LANES]; 2]) -> Self {
        Self { data }
    }
}

impl<const LANES: usize> From<Batched<LANES>> for [[i64; LANES]; 2] {
    fn from(val: Batched<LANES>) -> Self {
        [val.data[0], val.data[1]]
    }
}

impl<const LANES: usize> From<i64> for Batched<LANES> {
    fn from(data: i64) -> Self {
        // Splat the input across all the lanes.
        Self {
            data: [[data; LANES], [data; LANES]],
        }
    }
}

impl<const LANES: usize> Add for Batched<LANES> {
    type Output = Self;

    fn add(self, rhs: Self) -> Self::Output {
        let r_0: [i64; LANES] = self.data[0]
            .iter()
            .zip(rhs.data[0].iter())
            .map(|(x, y)| x + y)
            .collect::<Vec<i64>>()
            .try_into()
            .unwrap();
        let r_1: [i64; LANES] = self.data[1]
            .iter()
            .zip(rhs.data[1].iter())
            .map(|(x, y)| x + y)
            .collect::<Vec<i64>>()
            .try_into()
            .unwrap();

        Self { data: [r_0, r_1] }
    }
}

impl<const LANES: usize> Sub for Batched<LANES> {
    type Output = Self;

    fn sub(self, rhs: Self) -> Self::Output {
        let r_0: [i64; LANES] = self.data[0]
            .iter()
            .zip(rhs.data[0].iter())
            .map(|(x, y)| x - y)
            .collect::<Vec<i64>>()
            .try_into()
            .unwrap();
        let r_1: [i64; LANES] = self.data[1]
            .iter()
            .zip(rhs.data[1].iter())
            .map(|(x, y)| x - y)
            .collect::<Vec<i64>>()
            .try_into()
            .unwrap();

        Self { data: [r_0, r_1] }
    }
}

impl<const LANES: usize> Mul for Batched<LANES> {
    type Output = Self;

    fn mul(self, rhs: Self) -> Self::Output {
        let r_0: [i64; LANES] = self.data[0]
            .iter()
            .zip(rhs.data[0].iter())
            .map(|(x, y)| x * y)
            .collect::<Vec<i64>>()
            .try_into()
            .unwrap();
        let r_1: [i64; LANES] = self.data[1]
            .iter()
            .zip(rhs.data[1].iter())
            .map(|(x, y)| x * y)
            .collect::<Vec<i64>>()
            .try_into()
            .unwrap();

        Self { data: [r_0, r_1] }
    }
}

impl<const LANES: usize> Neg for Batched<LANES> {
    type Output = Self;

    fn neg(self) -> Self::Output {
        let r_0: [i64; LANES] = self.data[0]
            .iter()
            .map(|x| -x)
            .collect::<Vec<i64>>()
            .try_into()
            .unwrap();
        let r_1: [i64; LANES] = self.data[1]
            .iter()
            .map(|x| -x)
            .collect::<Vec<i64>>()
            .try_into()
            .unwrap();

        Self { data: [r_0, r_1] }
    }
}

impl<const LANES: usize> Shl<u64> for Batched<LANES> {
    type Output = Self;

    fn shl(self, x: u64) -> Self::Output {
        let r_0: [i64; LANES] = [
            self.data[0]
                .iter()
                .skip(x as usize)
                .copied()
                .collect::<Vec<i64>>(),
            self.data[0]
                .iter()
                .take(x as usize)
                .copied()
                .collect::<Vec<i64>>(),
        ]
        .concat()
        .try_into()
        .unwrap();

        let r_1: [i64; LANES] = [
            self.data[1]
                .iter()
                .skip(x as usize)
                .copied()
                .collect::<Vec<i64>>(),
            self.data[1]
                .iter()
                .take(x as usize)
                .copied()
                .collect::<Vec<i64>>(),
        ]
        .concat()
        .try_into()
        .unwrap();

        Self { data: [r_0, r_1] }
    }
}

impl<const LANES: usize> Shr<u64> for Batched<LANES> {
    type Output = Self;

    fn shr(self, x: u64) -> Self::Output {
        let r_0: [i64; LANES] = [
            self.data[0]
                .iter()
                .skip(LANES - x as usize)
                .copied()
                .collect::<Vec<i64>>(),
            self.data[0]
                .iter()
                .take(LANES - x as usize)
                .copied()
                .collect::<Vec<i64>>(),
        ]
        .concat()
        .try_into()
        .unwrap();

        let r_1: [i64; LANES] = [
            self.data[1]
                .iter()
                .skip(LANES - x as usize)
                .copied()
                .collect::<Vec<i64>>(),
            self.data[1]
                .iter()
                .take(LANES - x as usize)
                .copied()
                .collect::<Vec<i64>>(),
        ]
        .concat()
        .try_into()
        .unwrap();

        Self { data: [r_0, r_1] }
    }
}

impl<const LANES: usize> SwapRows for Batched<LANES> {
    type Output = Self;

    fn swap_rows(self) -> Self::Output {
        Self {
            data: [self.data[1], self.data[0]],
        }
    }
}

impl<const LANES: usize> Index<(usize, usize)> for Batched<LANES> {
    type Output = i64;

    fn index(&self, index: (usize, usize)) -> &Self::Output {
        let (row, col) = index;

        if row != 0 && row != 1 {
            panic!("Out of range [0, 1]");
        }

        &self.data[row][col]
    }
}

impl<const LANES: usize> GraphCipherAdd for Batched<LANES> {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_add(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_addition(a.ids[0], b.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherSub for Batched<LANES> {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_sub(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_subtraction(a.ids[0], b.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherMul for Batched<LANES> {
    type Left = Self;
    type Right = Self;

    fn graph_cipher_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: FheProgramNode<Cipher<Self::Right>>,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let n = ctx.add_multiplication(a.ids[0], b.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherConstMul for Batched<LANES> {
    type Left = Self;
    type Right = i64;

    fn graph_cipher_const_mul(
        a: FheProgramNode<Cipher<Self::Left>>,
        b: Self::Right,
    ) -> FheProgramNode<Cipher<Self::Left>> {
        with_ctx(|ctx| {
            let b = Self::from(b).try_into_plaintext(&ctx.params).unwrap();
            let l = ctx.add_plaintext_literal(b.inner);
            let n = ctx.add_multiplication_plaintext(a.ids[0], l);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherSwapRows for Batched<LANES> {
    fn graph_cipher_swap_rows(x: FheProgramNode<Cipher<Self>>) -> FheProgramNode<Cipher<Self>> {
        with_ctx(|ctx| {
            let n = ctx.add_swap_rows(x.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherRotateLeft for Batched<LANES> {
    fn graph_cipher_rotate_left(
        x: FheProgramNode<Cipher<Self>>,
        y: u64,
    ) -> FheProgramNode<Cipher<Self>> {
        with_ctx(|ctx| {
            let y = ctx.add_literal(Literal::U64(y));
            let n = ctx.add_rotate_left(x.ids[0], y);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherRotateRight for Batched<LANES> {
    fn graph_cipher_rotate_right(
        x: FheProgramNode<Cipher<Self>>,
        y: u64,
    ) -> FheProgramNode<Cipher<Self>> {
        with_ctx(|ctx| {
            let y = ctx.add_literal(Literal::U64(y));
            let n = ctx.add_rotate_right(x.ids[0], y);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const LANES: usize> GraphCipherNeg for Batched<LANES> {
    type Val = Self;

    fn graph_cipher_neg(x: FheProgramNode<Cipher<Self>>) -> FheProgramNode<Cipher<Self::Val>> {
        with_ctx(|ctx| {
            let n = ctx.add_negate(x.ids[0]);

            FheProgramNode::new(&[n])
        })
    }
}

impl<const LANES: usize> LaneCount for Batched<LANES> {
    fn lane_count() -> usize {
        LANES
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::SchemeType;
    use seal_fhe::{CoefficientModulus, PlainModulus, SecurityLevel};

    #[test]
    fn can_roundtrip_encode_batched() {
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

        let x = Batched::<4>::try_from(data).unwrap();

        let plaintext = x.try_into_plaintext(&params).unwrap();
        let y = Batched::<4>::try_from_plaintext(&plaintext, &params).unwrap();

        assert_eq!(x, y);
    }

    const A_VEC: [[i64; 4]; 2] = [[1, 2, 3, 4], [5, 6, 7, 8]];
    const B_VEC: [[i64; 4]; 2] = [[5, 6, 7, 8], [1, 2, 3, 4]];

    #[test]
    fn can_add_non_fhe() {
        let a = Batched::<4>::try_from(A_VEC).unwrap();
        let b = Batched::<4>::try_from(B_VEC).unwrap();

        assert_eq!(a + b, [[6, 8, 10, 12], [6, 8, 10, 12]].into());
    }

    #[test]
    fn can_mul_non_fhe() {
        let a = Batched::<4>::try_from(A_VEC).unwrap();
        let b = Batched::<4>::try_from(B_VEC).unwrap();

        assert_eq!(a * b, [[5, 12, 21, 32], [5, 12, 21, 32]].into());
    }

    #[test]
    fn can_sub_non_fhe() {
        let a = Batched::<4>::try_from(A_VEC).unwrap();
        let b = Batched::<4>::try_from(B_VEC).unwrap();

        assert_eq!(a - b, [[-4, -4, -4, -4], [4, 4, 4, 4]].into());
    }

    #[test]
    fn can_neg_non_fhe() {
        let a = Batched::<4>::try_from(A_VEC).unwrap();

        assert_eq!(-a, [[-1, -2, -3, -4], [-5, -6, -7, -8]].into());
    }

    #[test]
    fn can_shl_non_fhe() {
        let a = Batched::<4>::try_from(A_VEC).unwrap();

        assert_eq!(a << 3, [[4, 1, 2, 3], [8, 5, 6, 7]].into());
    }

    #[test]
    fn can_shr_non_fhe() {
        let a = Batched::<4>::try_from(A_VEC).unwrap();

        assert_eq!(a >> 3, [[2, 3, 4, 1], [6, 7, 8, 5]].into());
    }

    #[test]
    fn can_swap_rows_non_fhe() {
        let a = Batched::<4>::try_from(A_VEC).unwrap();

        assert_eq!(a.swap_rows(), [[5, 6, 7, 8], [1, 2, 3, 4]].into());
    }
}
