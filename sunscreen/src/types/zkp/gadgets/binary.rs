use sunscreen_zkp_backend::{BigInt, Gadget};

use crate::{invoke_gadget, with_zkp_ctx, zkp::ZkpContextOps};
use crypto_bigint::CheckedSub;

/**
 * Expands a field element into N-bit unsigned binary.
 */
pub struct ToUInt<const N: usize>;

trait GetBit {
    fn get_bit(&self, i: usize) -> u8;
}

impl GetBit for BigInt {
    fn get_bit(&self, i: usize) -> u8 {
        const LIMB_SIZE: usize = std::mem::size_of::<u64>();

        let limb = i / LIMB_SIZE;
        let bit = i % LIMB_SIZE;

        ((self.limbs()[limb].0 & (0x1 << bit)) >> bit) as u8
    }
}

impl<const N: usize> Gadget for ToUInt<N> {
    fn compute_inputs(&self, gadget_inputs: &[BigInt]) -> Vec<BigInt> {
        let val = gadget_inputs[0];
        let mut bits = vec![];

        for i in 0..N {
            bits.push(BigInt::from(val.get_bit(i)));
        }

        bits
    }

    fn gen_circuit(
        &self,
        gadget_inputs: &[petgraph::stable_graph::NodeIndex],
        hidden_inputs: &[petgraph::stable_graph::NodeIndex],
    ) -> Vec<petgraph::stable_graph::NodeIndex> {
        let val = gadget_inputs[0];

        let mut muls = vec![];

        let hidden_inputs = with_zkp_ctx(|ctx| {
            for i in 0..N {
                let constant = BigInt::from(*BigInt::ONE << i);
                let constant = ctx.add_constant(&constant);

                muls.push(ctx.add_multiplication(*hidden_inputs.get(i).unwrap(), constant));
            }

            if muls.len() >= 2 {
                let mut prev_addition = ctx.add_addition(muls[0], muls[1]);

                for i in muls.iter().skip(2) {
                    prev_addition = ctx.add_addition(prev_addition, *i);
                }

                let sub = ctx.add_subtraction(prev_addition, val);

                ctx.add_constraint(sub, &BigInt::ZERO);
            } else {
                let sub = ctx.add_subtraction(muls[0], val);

                ctx.add_constraint(sub, &BigInt::ZERO);
            }

            hidden_inputs
        });

        // Stop the prover from cheating and passing non-binary for
        // the expansion.
        for i in hidden_inputs {
            invoke_gadget(AssertBinary, &[*i]);
        }

        hidden_inputs.to_owned()
    }

    fn gadget_input_count(&self) -> usize {
        1
    }

    fn hidden_input_count(&self) -> usize {
        N
    }
}

/**
 * Proves the given input is 0 or 1. We do this by:
 * * Compute a_inv = 1 - a.
 * * Constrain a + a_inv = 1
 * * Constrain a * a_inv = 0
 */
pub struct AssertBinary;

impl Gadget for AssertBinary {
    fn compute_inputs(&self, gadget_inputs: &[BigInt]) -> Vec<BigInt> {
        let val = gadget_inputs[0];

        if val != BigInt::ONE && val != BigInt::ZERO {
            panic!("{:#?} is not binary", val);
        }

        vec![(*BigInt::ONE).checked_sub(&*val).unwrap().into()]
    }

    fn hidden_input_count(&self) -> usize {
        1
    }

    fn gadget_input_count(&self) -> usize {
        1
    }

    fn gen_circuit(
        &self,
        gadget_inputs: &[petgraph::stable_graph::NodeIndex],
        hidden_inputs: &[petgraph::stable_graph::NodeIndex],
    ) -> Vec<petgraph::stable_graph::NodeIndex> {
        let a = gadget_inputs[0];
        let a_not = hidden_inputs[0];

        with_zkp_ctx(|ctx| {
            let val = ctx.add_multiplication(a, a_not);

            ctx.add_constraint(val, &BigInt::ZERO);

            let sum = ctx.add_addition(a, a_not);

            ctx.add_constraint(sum, &BigInt::ONE);
        });

        vec![]
    }
}

#[cfg(test)]
mod tests {
    use sunscreen_runtime::{Runtime, ZkpProgramInput};
    use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;
    use sunscreen_zkp_backend::{BackendField, ZkpBackend};

    use crate as sunscreen;
    use crate::types::zkp::{NativeField, ToBinary};
    use crate::{zkp_program, Compiler};

    #[test]
    fn can_convert_to_binary() {
        // Prove we know the value that decomposes into 0b101010
        #[zkp_program(backend = "bulletproofs")]
        fn test<F: BackendField>(a: NativeField<F>) {
            let bits = a.to_unsigned::<6>();

            for (bit, expected) in bits.iter().zip([0u8, 1u8, 0u8, 1u8, 0u8, 1u8]) {
                bit.constrain_eq(NativeField::from(expected));
            }
        }

        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(test)
            .compile()
            .unwrap();

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

        let prog = app.get_zkp_program(test).unwrap();

        type BPField = NativeField<<BulletproofsBackend as ZkpBackend>::Field>;

        let proof = runtime
            .prove(prog, vec![], vec![], vec![BPField::from(42u8)])
            .unwrap();

        runtime
            .verify(prog, &proof, Vec::<ZkpProgramInput>::new(), vec![])
            .unwrap();
    }
}
