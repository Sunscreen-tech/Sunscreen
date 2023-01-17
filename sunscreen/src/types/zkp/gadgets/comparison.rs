use sunscreen_zkp_backend::Gadget;

use crate::{invoke_gadget, with_zkp_ctx, zkp::ZkpContextOps};

use super::ToUInt;

pub struct LessThanEqual {
    diff_bits: usize,
}

impl LessThanEqual {
    pub fn new(diff_bits: usize) -> Self {
        Self { diff_bits }
    }
}

impl Gadget for LessThanEqual {
    fn compute_inputs(
        &self,
        _gadget_inputs: &[sunscreen_zkp_backend::BigInt],
    ) -> sunscreen_zkp_backend::Result<Vec<sunscreen_zkp_backend::BigInt>> {
        Ok(vec![])
    }

    fn gadget_input_count(&self) -> usize {
        2
    }

    fn hidden_input_count(&self) -> usize {
        0
    }

    fn gen_circuit(
        &self,
        gadget_inputs: &[petgraph::stable_graph::NodeIndex],
        _hidden_inputs: &[petgraph::stable_graph::NodeIndex],
    ) -> Vec<petgraph::stable_graph::NodeIndex> {
        let lhs = gadget_inputs[0];
        let rhs = gadget_inputs[1];

        let diff = with_zkp_ctx(|ctx| ctx.add_subtraction(rhs, lhs));

        invoke_gadget(ToUInt::new(self.diff_bits), &[diff]);

        vec![]
    }
}

#[cfg(test)]
mod tests {
    use sunscreen_compiler_macros::zkp_program;
    use sunscreen_runtime::{Runtime, ZkpProgramInput};
    use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, BackendField, ZkpBackend};

    use super::*;
    use crate::{types::zkp::NativeField, Compiler};

    use crate as sunscreen;

    #[test]
    fn prove_less_equal() {
        #[zkp_program(backend = "bulletproofs")]
        fn le<F: BackendField>(x: NativeField<F>, y: NativeField<F>) {
            invoke_gadget(LessThanEqual::new(4), &[x.ids[0], y.ids[0]]);
        }

        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(le)
            .compile()
            .unwrap();

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

        let program = app.get_zkp_program(le).unwrap();

        let test_case = |x: u64, y: u64, expect_pass: bool| {
            type BpField = NativeField<<BulletproofsBackend as ZkpBackend>::Field>;

            let result = runtime.prove(
                program,
                vec![],
                vec![],
                vec![BpField::from(x), BpField::from(y)],
            );

            let proof = if expect_pass {
                result.unwrap()
            } else {
                assert!(result.is_err());
                return;
            };

            runtime
                .verify(program, &proof, vec![], Vec::<ZkpProgramInput>::new())
                .unwrap();
        };

        test_case(5, 6, true);
        test_case(5, 5, true);
        test_case(6, 5, false);
        // Out of range for unsigned int gadget (4 bits).
        test_case(6, 1024, false);
    }
}
