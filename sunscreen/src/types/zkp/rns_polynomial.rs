use petgraph::stable_graph::NodeIndex;
use sunscreen_compiler_macros::TypeName;
use sunscreen_runtime::ZkpProgramInputTrait;
use sunscreen_zkp_backend::{BackendField, BigInt};

use crate::{
    types::zkp::{Coerce, ProgramNode},
    with_zkp_ctx,
    zkp::ZkpContextOps,
};

use super::{AddVar, Mod, MulVar, NativeField, NumFieldElements, ToNativeFields, ZkpType};

use crate as sunscreen;

/**
 * A polynomial in Z_q[X]/(X^N+1), up to degree N-1. `q` is the
 * coefficient modulus and is the product of R factors. Each coefficient is decomposed
 * into R residues (i.e. RNS form).
 *
 * # Remarks
 * Operations (e.g. add, mul, etc) don't automatically reduce modulo q. This enables
 * program authors to batch multiple operations before reduction.
 *
 * Operations *do* reduce modulo X^N+1.
 */
#[derive(Debug, Clone, TypeName)]
pub struct RnsRingPolynomial<F: BackendField, const N: usize, const R: usize> {
    data: Box<[[NativeField<F>; N]; R]>,
}

impl<F: BackendField, T, const N: usize, const R: usize> From<[[T; N]; R]>
    for RnsRingPolynomial<F, N, R>
where
    T: Into<NativeField<F>> + std::fmt::Debug,
{
    fn from(x: [[T; N]; R]) -> Self {
        Self {
            data: Box::new(x.map(|x| x.map(|x| x.into()))),
        }
    }
}

impl<F: BackendField, const N: usize, const R: usize> NumFieldElements
    for RnsRingPolynomial<F, N, R>
{
    const NUM_NATIVE_FIELD_ELEMENTS: usize = N * R;
}

impl<F: BackendField, const N: usize, const R: usize> ToNativeFields
    for RnsRingPolynomial<F, N, R>
{
    fn to_native_fields(&self) -> Vec<BigInt> {
        self.data.into_iter().flatten().map(|x| x.val).collect()
    }
}

impl<F: BackendField, const N: usize, const R: usize> ZkpType for RnsRingPolynomial<F, N, R> {}

/**
 * Returns the RNS residues for each coefficient. The coefficient index
 * is the leading dimension for efficient NTT transforms.
 */
pub trait ToResidues<F: BackendField, const N: usize, const R: usize> {
    /**
     * Return the residues.
     */
    fn residues(&self) -> [[ProgramNode<NativeField<F>>; N]; R];
}

impl<F: BackendField, const N: usize, const R: usize> ToResidues<F, N, R>
    for ProgramNode<RnsRingPolynomial<F, N, R>>
{
    fn residues(&self) -> [[ProgramNode<NativeField<F>>; N]; R] {
        let mut program_nodes = [[ProgramNode::new(&[]); N]; R];

        for i in 0..N * R {
            let coeff = i % N;
            let residue = i / N;

            program_nodes[residue][coeff] = ProgramNode::new(&[self.ids[i]])
        }

        program_nodes
    }
}

impl<F: BackendField, const N: usize, const R: usize> AddVar for RnsRingPolynomial<F, N, R> {
    fn add(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        let mut node_indices = vec![];

        with_zkp_ctx(|ctx| {
            for (left, right) in lhs.ids.iter().zip(rhs.ids.iter()) {
                node_indices.push(ctx.add_addition(*left, *right));
            }
        });

        Self::coerce(&node_indices)
    }
}

impl<F: BackendField, const N: usize, const R: usize> ZkpProgramInputTrait
    for RnsRingPolynomial<F, N, R>
{
}

impl<F: BackendField, const N: usize, const R: usize> MulVar for RnsRingPolynomial<F, N, R> {
    fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        let left = lhs.residues();
        let right = rhs.residues();

        let mut out_coeffs = vec![];

        with_zkp_ctx(|ctx| {
            out_coeffs = vec![ctx.add_constant(&BigInt::ZERO); N * R];

            for residue in 0..R {
                let left = left[residue];
                let right = right[residue];

                let out_coeffs = &mut out_coeffs[residue * N..(residue + 1) * N];

                for (i, left) in left.iter().enumerate().take(N) {
                    for (j, right) in right.iter().enumerate().take(N) {
                        let out_coeff = (i + j) % N;

                        let mul = ctx.add_multiplication(left.ids[0], right.ids[0]);

                        let op = if i + j >= N {
                            ctx.add_subtraction(out_coeffs[out_coeff], mul)
                        } else {
                            ctx.add_addition(out_coeffs[out_coeff], mul)
                        };

                        out_coeffs[out_coeff] = op;
                    }
                }
            }
        });

        Self::coerce(&out_coeffs)
    }
}

/**
 * For scaling an algebraic structure (e.g. polynomial.)
 */
pub trait Scale<F: BackendField> {
    /**
     * Return a structure scaled by `x`.
     */
    fn scale(self, x: ProgramNode<NativeField<F>>) -> Self;
}

impl<F: BackendField, const D: usize, const R: usize> Scale<F>
    for ProgramNode<RnsRingPolynomial<F, D, R>>
{
    fn scale(self, x: ProgramNode<NativeField<F>>) -> Self {
        let mut output = vec![NodeIndex::from(0); D * R];

        with_zkp_ctx(|ctx| {
            for (i, o) in output.iter_mut().enumerate().take(R * D) {
                *o = ctx.add_multiplication(self.ids[i], x.ids[0]);
            }
        });

        Self::new(&output)
    }
}

impl<F: BackendField, const D: usize, const R: usize> Mod<F> for RnsRingPolynomial<F, D, R> {
    fn signed_reduce(
        lhs: ProgramNode<Self>,
        m: ProgramNode<NativeField<F>>,
        remainder_bits: usize,
    ) -> ProgramNode<Self> {
        let residues = lhs.residues();

        let mut outputs = vec![];

        for r in residues.iter().take(R) {
            for j in r {
                outputs.push(NativeField::signed_reduce(*j, m, remainder_bits).ids[0]);
            }
        }

        ProgramNode::new(&outputs)
    }
}

#[cfg(test)]
mod tests {
    use sunscreen_runtime::{Runtime, ZkpProgramInput};
    use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;
    use sunscreen_zkp_backend::{BackendField, ZkpBackend};

    use crate as sunscreen;
    use crate::types::zkp::rns_polynomial::{RnsRingPolynomial, ToResidues};
    use crate::types::zkp::{NativeField, Scale};
    use crate::{zkp_program, Compiler};

    #[test]
    fn can_prove_added_polynomials() {
        #[zkp_program(backend = "bulletproofs")]
        fn add_poly<F: BackendField>(
            #[constant] a: RnsRingPolynomial<F, 8, 2>,
            #[constant] b: RnsRingPolynomial<F, 8, 2>,
        ) {
            let c = a + b;

            let residues = c.residues();

            let expected = [
                [2u8, 4u8, 6u8, 8u8, 10u8, 12u8, 14u8, 16u8],
                [18u8, 20u8, 22u8, 24u8, 26u8, 28u8, 30u8, 32],
            ];

            for i in 0..residues.len() {
                for j in 0..residues[i].len() {
                    residues[i][j].constrain_eq(NativeField::from(expected[i][j]));
                }
            }
        }

        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(add_poly)
            .compile()
            .unwrap();

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

        let program = app.get_zkp_program(add_poly).unwrap();

        type BPRnsRingPolynomial<const N: usize, const R: usize> =
            RnsRingPolynomial<<BulletproofsBackend as ZkpBackend>::Field, N, R>;

        let a = BPRnsRingPolynomial::from([
            [1u8, 2, 3, 4, 5, 6, 7, 8],
            [9, 10, 11, 12, 13, 14, 15, 16],
        ]);

        let proof = runtime
            .prove(program, vec![a.clone(), a.clone()], vec![], vec![])
            .unwrap();

        runtime
            .verify(program, &proof, vec![a.clone(), a.clone()], vec![])
            .unwrap();

        let b =
            RnsRingPolynomial::from([[0u8, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15, 16]]);

        let result = runtime.verify(program, &proof, vec![b, a], vec![]);

        assert!(result.is_err());
    }

    #[test]
    fn can_prove_multiply_polynomials() {
        #[zkp_program(backend = "bulletproofs")]
        fn add_poly<F: BackendField>(
            #[constant] a: RnsRingPolynomial<F, 8, 2>,
            #[constant] b: RnsRingPolynomial<F, 8, 2>,
        ) {
            let c = a * b;

            let residues = c.residues();

            let expected = [
                [-146, -160, -160, -144, -110, -56, 20, 120],
                [-1074, -896, -672, -400, -78, 296, 724, 1208],
            ];

            for i in 0..residues.len() {
                for j in 0..residues[i].len() {
                    residues[i][j].constrain_eq(NativeField::from(expected[i][j]));
                }
            }
        }

        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(add_poly)
            .compile()
            .unwrap();

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

        let program = app.get_zkp_program(add_poly).unwrap();

        type BpPoly<const N: usize, const R: usize> =
            RnsRingPolynomial<<BulletproofsBackend as ZkpBackend>::Field, N, R>;

        let a = BpPoly::from([[1u8, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15, 16]]);

        let proof = runtime
            .prove(program, vec![a.clone(), a.clone()], vec![], vec![])
            .unwrap();

        runtime
            .verify(program, &proof, vec![a.clone(), a.clone()], vec![])
            .unwrap();

        let b = BpPoly::from([[0u8, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15, 16]]);

        let result = runtime.verify(program, &proof, vec![b, a], vec![]);

        assert!(result.is_err());
    }

    #[test]
    fn can_scale_polynomial() {
        #[zkp_program(backend = "bulletproofs")]
        fn add_poly<F: BackendField>(
            #[constant] a: RnsRingPolynomial<F, 8, 2>,
            #[constant] b: NativeField<F>,
        ) {
            let c = a.scale(b);

            let expected = [
                [2u8, 4u8, 6u8, 8u8, 10u8, 12u8, 14u8, 16u8],
                [18u8, 20u8, 22u8, 24u8, 26u8, 28u8, 30u8, 32],
            ];

            let residues = c.residues();

            for i in 0..residues.len() {
                for j in 0..residues[i].len() {
                    residues[i][j].constrain_eq(NativeField::from(expected[i][j]));
                }
            }
        }

        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(add_poly)
            .compile()
            .unwrap();

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

        let program = app.get_zkp_program(add_poly).unwrap();

        type BPRnsRingPolynomial<const N: usize, const R: usize> =
            RnsRingPolynomial<<BulletproofsBackend as ZkpBackend>::Field, N, R>;

        let a = BPRnsRingPolynomial::from([
            [1u8, 2, 3, 4, 5, 6, 7, 8],
            [9, 10, 11, 12, 13, 14, 15, 16],
        ]);

        type BpField = NativeField<<BulletproofsBackend as ZkpBackend>::Field>;

        let b = BpField::from(2u8);

        let const_args: Vec<ZkpProgramInput> = vec![a.into(), b.into()];

        let proof = runtime
            .prove(program, const_args.clone(), vec![], vec![])
            .unwrap();

        runtime
            .verify(program, &proof, const_args.clone(), vec![])
            .unwrap();
    }
}
