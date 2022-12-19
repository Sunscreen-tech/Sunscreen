use petgraph::stable_graph::NodeIndex;
use sunscreen_compiler_macros::TypeName;
use sunscreen_runtime::ZkpProgramInputTrait;
use sunscreen_zkp_backend::{BackendField, BigInt};

use crate::{
    types::zkp::{Coerce, ProgramNode},
    with_zkp_ctx,
    zkp::ZkpContextOps,
};

use super::{AddVar, NativeField, NumFieldElements, ToNativeFields, ZkpType, MulVar};

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

pub trait ToResidues<F: BackendField, const N: usize, const R: usize> {
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

impl<const N: usize, const R: usize> MulVar for RnsRingPolynomial<N, R> {
    fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        let left = lhs.residues();
        let right = rhs.residues();

        let mut node_indices: Vec<NodeIndex> = vec![];

        with_zkp_ctx(|ctx| {
            for i in 0..R * N {
                node_indices.push(ctx.add_constant(&BigInt::ZERO));
            }

            for residue in 0..R {
                let left = left[residue];
                let right = right[residue];

                let node_indices = &mut node_indices[residue * N..(residue + 1) * N];

                for i in 0..N {
                    for j in 0..N {
                        let out_coeff = (i + j) % N;

                        let mul = ctx.add_multiplication(left[i].ids[0], right[j].ids[0]);

                        let op = if i + j >= N {
                            ctx.add_subtraction(node_indices[out_coeff], mul)
                        } else {
                            ctx.add_addition(node_indices[out_coeff], mul)
                        };

                        node_indices[out_coeff] = op;
                    }
                }
            }
        });

        Self::coerce(&node_indices)

    }
}

#[cfg(test)]
mod tests {
    use sunscreen_runtime::Runtime;
    use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;
    use sunscreen_zkp_backend::{BackendField, ZkpBackend};

    use crate as sunscreen;
    use crate::types::zkp::rns_polynomial::{RnsRingPolynomial, ToResidues};
    use crate::types::zkp::NativeField;
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
        fn add_poly(
            #[constant] a: RnsRingPolynomial<8, 2>,
            #[constant] b: RnsRingPolynomial<8, 2>,
        ) {
            let c = a + b;

            let residues = c.residues();

            let expected = [
                [-146i8, -160, -160, -144, -110,  -56,   20,  120],
                [18, 20, 22, 24, 26, 28, 30, 32],
            ];

            for i in 0..residues.len() {
                for j in 0..residues[i].len() {
                    residues[i][j].constrain_eq(NativeField::from(expected[i][j]));
                }
            }
        }

        let app = Compiler::new().zkp_program(add_poly).compile().unwrap();

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

        let program = app.get_zkp_program(add_poly).unwrap();

        let a =
            RnsRingPolynomial::from([[1u8, 2, 3, 4, 5, 6, 7, 8], [9, 10, 11, 12, 13, 14, 15, 16]]);

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
}
