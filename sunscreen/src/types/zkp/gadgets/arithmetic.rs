use std::marker::PhantomData;

use crypto_bigint::UInt;
use subtle::{ConstantTimeGreater, CtOption, ConditionallySelectable, Choice, ConstantTimeEq};
use sunscreen_zkp_backend::{BackendField, Gadget, BigInt};

use crate::{with_zkp_ctx, zkp::ZkpContextOps};

pub struct SignedModulus {
    m: BigInt,
    field_modulus: BigInt
}

impl SignedModulus {
    /**
     * Creates a new Signed modulus gadget.
     * 
     * # Panics
     * * When `m == 0`.
     * * When `field_modulus == 0`
     */
    pub fn new(m: BigInt, field_modulus: BigInt) -> Self {
        assert_ne!(m, BigInt::ZERO);
        assert_ne!(field_modulus, BigInt::ZERO);

        Self {
            m,
            field_modulus
        }
    }
}

impl Gadget for SignedModulus {
    fn gen_circuit(
            &self,
            gadget_inputs: &[petgraph::stable_graph::NodeIndex],
            hidden_inputs: &[petgraph::stable_graph::NodeIndex],
        ) -> Vec<petgraph::stable_graph::NodeIndex> {
        let q = hidden_inputs[0];
        let r = hidden_inputs[1];
        let x = gadget_inputs[0];

        with_zkp_ctx(|ctx| {
            // assert mq + r == x
            let m = ctx.add_constant(&self.m);

            let t = ctx.add_multiplication(m, q);
            let res = ctx.add_addition(t, r);
            let diff = ctx.add_subtraction(x, res);
            
            ctx.add_constraint(diff, &BigInt::ZERO);

            // TODO: Assert 0 < r < m.

        });

        
        vec![hidden_inputs[0], hidden_inputs[1]]
    }

    fn hidden_input_count(&self) -> usize {
        2
    }

    fn gadget_input_count(&self) -> usize {
        1
    }

    fn compute_inputs(&self, gadget_inputs: &[sunscreen_zkp_backend::BigInt]) -> Vec<sunscreen_zkp_backend::BigInt> {
        let x = gadget_inputs[0];

        // As per docs, when shift amount is constant, time is constant.
        // See https://docs.rs/crypto-bigint/latest/crypto_bigint/struct.UInt.html#method.shr_vartime
        let fm_2 = self.field_modulus.shr_vartime(2);        

        let is_neg = x.ct_gt(&fm_2);
        let (q_pos, r_pos) = x.div_rem(&self.m).unwrap();

        // If x is negative, this produces abs(x)
        let pos_x = self.field_modulus.wrapping_sub(&x);

        // Now we reduce mod m then subtract from m to get x mod m where x < 0.
        let r_neg = self.m.wrapping_sub(&pos_x.reduce(&self.m).unwrap()).reduce(&self.m).unwrap();

        // q should round towards -Inf, so r != 0, subtract one.
        let correction = UInt::conditional_select(&UInt::ONE, &UInt::ZERO, r_neg.ct_eq(&BigInt::ZERO));

        let q_neg = self.field_modulus.wrapping_sub(&pos_x.wrapping_div(&self.m).wrapping_add(&correction));

        let q = UInt::conditional_select(&q_pos, &q_neg, is_neg);

        let r = UInt::conditional_select(&r_pos, &r_neg, is_neg);
 
        vec![BigInt::from(q), BigInt::from(r)]
    }
}

#[cfg(test)]
mod tests {
    use sunscreen_compiler_macros::zkp_program;
    use sunscreen_runtime::{Runtime, FheProgramInput, ZkpProgramInput};
    use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, ZkpBackend};

    use crate::types::zkp::NativeField;
    use crate::{self as sunscreen, invoke_gadget, Compiler};

    use super::*;

    #[test]
    fn compute_inputs_is_correct() {
        let m = BigInt::from(22u32);
        let field_modulus = <BulletproofsBackend as ZkpBackend>::Field::FIELD_MODULUS;

        let gadget = SignedModulus::new(m, field_modulus);

        let test_case = |x: BigInt| {
            let outputs = gadget.compute_inputs(&[x]);

            let q = outputs[0];
            let r = outputs[1];

            assert_eq!(BigInt::from(m.wrapping_mul(&q).wrapping_add(&r).reduce(&field_modulus).unwrap()), x);
            assert!(r < m);
        };

        test_case(47u32.into());
        test_case(field_modulus.wrapping_sub(&47u32.into()).into());
        test_case(field_modulus.wrapping_sub(&1247u32.into()).into());
        test_case(field_modulus.wrapping_sub(&44u32.into()).into());
    }

    #[test]
    fn gadget_works() {
        #[zkp_program(backend = "bulletproofs")]
        fn div_rem<F: BackendField>(x: NativeField<F>, expected_q: NativeField<F>, expected_r: NativeField<F>) {
            let outs = invoke_gadget(SignedModulus::new(BigInt::from(22u16), F::FIELD_MODULUS), &x.ids);

            let q = ProgramNode::<NativeField<F>>::new(&[outs[0]]);
            let r = ProgramNode::<NativeField<F>>::new(&[outs[1]]);

            (q - expected_q).constrain_eq(NativeField::from(0u32));
            (r - expected_r).constrain_eq(NativeField::from(0u32));
        }

        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(div_rem)
            .compile()
            .unwrap();

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();
        
        let prog = app.get_zkp_program(div_rem).unwrap();

        type BpField = NativeField<<BulletproofsBackend as ZkpBackend>::Field>;

        let proof = runtime.prove(prog, vec![], vec![], vec![BpField::from(47), BpField::from(2), BpField::from(3)]).unwrap();

        runtime.verify(prog, &proof, vec![], Vec::<ZkpProgramInput>::new()).unwrap();

        let proof = runtime.prove(prog, vec![], vec![], vec![BpField::from(-47), BpField::from(-30), BpField::from(-23)]).unwrap();
    }
}