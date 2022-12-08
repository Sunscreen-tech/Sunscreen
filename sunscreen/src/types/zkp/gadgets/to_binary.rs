use sunscreen_zkp_backend::{BigInt, Gadget};

use crate::{with_zkp_ctx, zkp::ZkpContextOps};

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

        with_zkp_ctx(|ctx| {
            for i in 0..N {
                let constant = BigInt::from(*BigInt::ONE << i);
                let constant = ctx.add_constant(&constant);

                muls.push(ctx.add_multiplication(hidden_inputs[i], constant));
            }

            if muls.len() >= 2 {
                let mut prev_addition = ctx.add_addition(muls[0], muls[1]);

                for i in 2..muls.len() {
                    prev_addition = ctx.add_addition(prev_addition, muls[i]);
                }

                let sub = ctx.add_subtraction(prev_addition, val);

                ctx.add_constraint(sub, &BigInt::ZERO);
            } else {
                let sub = ctx.add_subtraction(muls[0], val);

                ctx.add_constraint(sub, &BigInt::ZERO);
            }

            hidden_inputs.to_owned()
        })
    }

    fn get_gadget_input_count(&self) -> usize {
        1
    }

    fn get_hidden_input_count(&self) -> usize {
        N
    }

    fn debug_name(&self) -> &'static str {
        std::any::type_name::<Self>()
    }
}

#[cfg(test)]
mod tests {
    use sunscreen_runtime::Runtime;
    use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;

    use super::*;
    use crate as sunscreen;
    use crate::types::zkp::{NativeField, ToBinary};
    use crate::{zkp_program, Compiler};

    #[test]
    fn can_convert_to_binary() {
        #[zkp_program(backend = "bulletproofs")]
        fn test(a: NativeField) {
            let bits = a.to_unsigned::<6>();

            for (bit, expected) in bits.iter().zip([0u8, 1u8, 0u8, 1u8, 0u8, 1u8]) {
                bit.constrain_eq(NativeField::from(expected));
            }
        }

        let app = Compiler::new().zkp_program(test).compile().unwrap();

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

        let prog = app.get_zkp_program(test).unwrap();

        let proof = runtime.prove(prog, &[], &[BigInt::from(42u8)]).unwrap();

        runtime.verify(prog, &proof, &[]).unwrap();
    }
}
