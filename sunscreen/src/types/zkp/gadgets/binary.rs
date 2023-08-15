use sunscreen_zkp_backend::{BigInt, Error as ZkpError, Gadget, Result as ZkpResult};

use crate::zkp::{invoke_gadget, with_zkp_ctx, ZkpContextOps};

/**
 * Expands a field element into N-bit unsigned binary.
 */
pub struct ToUInt {
    n: usize,
}

impl ToUInt {
    /**
     * Creates a new [`ToUInt`] gadget.
     *
     * # Panics
     * * If n > 512
     */
    pub fn new(n: usize) -> Self {
        if n > 512 {
            panic!("Cannot decompose into > 512 bit values.");
        }

        Self { n }
    }
}

impl Gadget for ToUInt {
    fn compute_hidden_inputs(&self, gadget_inputs: &[BigInt]) -> ZkpResult<Vec<BigInt>> {
        let val = gadget_inputs[0];

        if self.n == 0 {
            return Err(ZkpError::gadget_error("Cannot create 0-bit uint."));
        }

        if *val > BigInt::ONE.shl_vartime(self.n) {
            return Err(ZkpError::gadget_error(&format!(
                "Value too large for {} bit unsigned int.",
                self.n
            )));
        }

        let mut bits = vec![];

        for i in 0..self.n {
            bits.push(BigInt::from(val.bit_vartime(i) as u8));
        }

        Ok(bits)
    }

    fn gen_circuit(
        &self,
        gadget_inputs: &[petgraph::stable_graph::NodeIndex],
        hidden_inputs: &[petgraph::stable_graph::NodeIndex],
    ) -> Vec<petgraph::stable_graph::NodeIndex> {
        let val = gadget_inputs[0];

        let mut muls = vec![];

        let hidden_inputs = with_zkp_ctx(|ctx| {
            for i in 0..self.n {
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
        self.n
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
    fn compute_hidden_inputs(&self, gadget_inputs: &[BigInt]) -> ZkpResult<Vec<BigInt>> {
        let val = gadget_inputs[0];

        if val != BigInt::ONE && val != BigInt::ZERO {
            return Err(ZkpError::gadget_error("Value is not binary."));
        }

        Ok(vec![])
    }

    fn hidden_input_count(&self) -> usize {
        0
    }

    fn gadget_input_count(&self) -> usize {
        1
    }

    fn gen_circuit(
        &self,
        gadget_inputs: &[petgraph::stable_graph::NodeIndex],
        _hidden_inputs: &[petgraph::stable_graph::NodeIndex],
    ) -> Vec<petgraph::stable_graph::NodeIndex> {
        let a = gadget_inputs[0];

        with_zkp_ctx(|ctx| {
            let one = ctx.add_constant(&BigInt::ONE);

            let a_min_1 = ctx.add_subtraction(a, one);

            let poly = ctx.add_multiplication(a, a_min_1);

            ctx.add_constraint(poly, &BigInt::ZERO);
        });

        vec![]
    }
}

#[cfg(test)]
mod tests {
    use sunscreen_runtime::{Runtime, ZkpProgramInput};
    use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;
    use sunscreen_zkp_backend::{FieldSpec, ZkpBackend};

    use crate::types::zkp::{Field, ToBinary};
    use crate::{self as sunscreen, invoke_gadget};
    use crate::{zkp_program, Compiler};

    use super::*;

    #[test]
    fn can_assert_binary() {
        // Prove we know the value that decomposes into 0b101010
        #[zkp_program]
        fn test<F: FieldSpec>(a: Field<F>) {
            invoke_gadget(AssertBinary, a.ids);
        }

        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(test)
            .compile()
            .unwrap();

        let runtime = Runtime::new_zkp(BulletproofsBackend::new()).unwrap();

        let prog = app.get_zkp_program(test).unwrap();

        type BPField = Field<<BulletproofsBackend as ZkpBackend>::Field>;

        let test_proof = |x: u8, expect_pass: bool| {
            let result = runtime.prove(prog, vec![BPField::from(x)], vec![], vec![]);

            let proof = if expect_pass {
                result.unwrap()
            } else {
                assert!(result.is_err());
                return;
            };

            runtime
                .verify(prog, &proof, Vec::<ZkpProgramInput>::new(), vec![])
                .unwrap();
        };

        test_proof(0u8, true);
        test_proof(1u8, true);
        test_proof(2u8, false);
    }

    #[test]
    fn can_convert_to_binary() {
        // Prove we know the value that decomposes into 0b101010
        #[zkp_program]
        fn test<F: FieldSpec>(a: Field<F>) {
            let bits = a.to_unsigned::<6>();

            for (bit, expected) in bits.iter().zip([0u8, 1u8, 0u8, 1u8, 0u8, 1u8]) {
                bit.constrain_eq(Field::from(expected));
            }
        }

        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(test)
            .compile()
            .unwrap();

        let runtime = Runtime::new_zkp(BulletproofsBackend::new()).unwrap();

        let prog = app.get_zkp_program(test).unwrap();

        type BPField = Field<<BulletproofsBackend as ZkpBackend>::Field>;

        let proof = runtime
            .prove(prog, vec![BPField::from(42u8)], vec![], vec![])
            .unwrap();

        runtime
            .verify(prog, &proof, Vec::<ZkpProgramInput>::new(), vec![])
            .unwrap();
    }
}
