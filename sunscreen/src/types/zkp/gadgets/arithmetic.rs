use crypto_bigint::UInt;
use subtle::{ConditionallySelectable, ConstantTimeEq, ConstantTimeGreater};
use sunscreen_zkp_backend::{BigInt, Error as ZkpError, Gadget};

use crate::{invoke_gadget, with_zkp_ctx, zkp::ZkpContextOps, ZkpResult};

use super::ToUInt;

pub struct SignedModulus {
    field_modulus: BigInt,
    max_remainder_bits: usize,
}

impl SignedModulus {
    /**
     * Creates a new Signed modulus gadget.
     *
     * # Remarks
     * To produce efficient circuits, you must specify the maximum number
     * of bits the remainder requires. This value should be
     * `ceil(log2(abs(m)))`.
     * Additionally, this value must be less than `log2(f)` where `f`
     * is the size of the backend field.
     *
     * # Panics
     * * When `field_modulus == 0`
     * * When max_remainder_bits > 512
     */
    pub fn new(field_modulus: BigInt, max_remainder_bits: usize) -> Self {
        assert_ne!(field_modulus, BigInt::ZERO);
        assert!(max_remainder_bits <= 512);

        Self {
            field_modulus,
            max_remainder_bits,
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
        let m = gadget_inputs[1];

        let m_min_1_min_r = with_zkp_ctx(|ctx| {
            // assert mq + r == x
            let t = ctx.add_multiplication(m, q);
            let res = ctx.add_addition(t, r);
            let diff = ctx.add_subtraction(x, res);

            ctx.add_constraint(diff, &BigInt::ZERO);

            // Compute m - 1 - r so we can later attempt a binary expansion
            let one = ctx.add_constant(&BigInt::ONE);
            let m_min_1 = ctx.add_subtraction(m, one);
            ctx.add_subtraction(m_min_1, r)
        });

        // Get a bound [0, 2^k]. This establishes r >= 0.
        invoke_gadget(ToUInt::new(self.max_remainder_bits), &[r]);

        // Show r < m
        invoke_gadget(ToUInt::new(self.max_remainder_bits), &[m_min_1_min_r]);

        // Show that m is non-zero
        invoke_gadget(Inverse::new(self.field_modulus), &[m]);

        vec![hidden_inputs[0], hidden_inputs[1]]
    }

    fn hidden_input_count(&self) -> usize {
        2
    }

    fn gadget_input_count(&self) -> usize {
        2
    }

    fn compute_inputs(
        &self,
        gadget_inputs: &[sunscreen_zkp_backend::BigInt],
    ) -> ZkpResult<Vec<sunscreen_zkp_backend::BigInt>> {
        let x = gadget_inputs[0];
        let m = gadget_inputs[1];

        if m == BigInt::ZERO {
            return Err(ZkpError::gadget_error("Divide by zero."));
        }

        // As per docs, when shift amount is constant, time is constant.
        // See https://docs.rs/crypto-bigint/latest/crypto_bigint/struct.UInt.html#method.shr_vartime
        let fm_2 = self.field_modulus.shr_vartime(2);

        let is_neg = x.ct_gt(&fm_2);
        let (q_pos, r_pos) = x.div_rem(&m).unwrap();

        // If x is negative, this produces abs(x)
        let pos_x = self.field_modulus.wrapping_sub(&x);

        // Now we reduce mod m then subtract from m to get x mod m where x < 0.
        // Unwrap is okay here because we've already checked for m == 0.
        let r_neg = m
            .wrapping_sub(&pos_x.reduce(&m).unwrap())
            .reduce(&m)
            .unwrap();

        // q should round towards -Inf, so r != 0, subtract one.
        let correction =
            UInt::conditional_select(&UInt::ONE, &UInt::ZERO, r_neg.ct_eq(&BigInt::ZERO));

        let q_neg = self
            .field_modulus
            .wrapping_sub(&pos_x.wrapping_div(&m).wrapping_add(&correction));

        let q = UInt::conditional_select(&q_pos, &q_neg, is_neg);

        let r = UInt::conditional_select(&r_pos, &r_neg, is_neg);

        Ok(vec![BigInt::from(q), BigInt::from(r)])
    }
}

/**
 * For value x, generate x^-1 and prove that x*x^-1 = 1.
 */
pub struct Inverse {
    field_modulus: BigInt,
}

impl Inverse {
    pub fn new(field_modulus: BigInt) -> Self {
        if field_modulus == BigInt::ZERO {
            panic!("Field modulus cannot be zero.");
        }

        Self { field_modulus }
    }
}

impl Gadget for Inverse {
    fn compute_inputs(&self, gadget_inputs: &[BigInt]) -> ZkpResult<Vec<BigInt>> {
        let x = gadget_inputs[0];

        if x == BigInt::ZERO {
            return Err(ZkpError::gadget_error("Cannot take inverse of zero."));
        }

        Ok(vec![x.inverse_fp(&self.field_modulus)])
    }

    fn gadget_input_count(&self) -> usize {
        1
    }

    fn hidden_input_count(&self) -> usize {
        1
    }

    fn gen_circuit(
        &self,
        gadget_inputs: &[petgraph::stable_graph::NodeIndex],
        hidden_inputs: &[petgraph::stable_graph::NodeIndex],
    ) -> Vec<petgraph::stable_graph::NodeIndex> {
        let x = gadget_inputs[0];
        let x_inv = hidden_inputs[0];

        with_zkp_ctx(|ctx| {
            // Assert x * x^-1 == 1
            let prod = ctx.add_multiplication(x, x_inv);
            ctx.add_constraint(prod, &BigInt::ONE);
        });

        vec![x_inv]
    }
}

#[cfg(test)]
mod tests {
    use sunscreen_compiler_macros::zkp_program;
    use sunscreen_runtime::{Runtime, ZkpProgramInput};
    use sunscreen_zkp_backend::BackendField;
    use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, ZkpBackend};

    use crate::types::zkp::NativeField;
    use crate::{self as sunscreen, invoke_gadget, Compiler};

    use super::*;

    #[test]
    fn compute_inputs_is_correct() {
        let m = BigInt::from(22u32);
        let field_modulus = <BulletproofsBackend as ZkpBackend>::Field::FIELD_MODULUS;

        let gadget = SignedModulus::new(field_modulus, 16);

        let test_case = |x: BigInt| {
            let outputs = gadget.compute_inputs(&[x, m]).unwrap();

            let q = outputs[0];
            let r = outputs[1];

            assert_eq!(
                BigInt::from(
                    m.wrapping_mul(&q)
                        .wrapping_add(&r)
                        .reduce(&field_modulus)
                        .unwrap()
                ),
                x
            );
            assert!(r < m);
        };

        test_case(47u32.into());
        test_case(field_modulus.wrapping_sub(&47u32.into()).into());
        test_case(field_modulus.wrapping_sub(&1247u32.into()).into());
        test_case(field_modulus.wrapping_sub(&44u32.into()).into());
    }

    #[test]
    fn modulus_gadget_works() {
        #[zkp_program]
        fn div_rem<F: BackendField>(
            x: NativeField<F>,
            m: NativeField<F>,
            expected_q: NativeField<F>,
            expected_r: NativeField<F>,
        ) {
            let outs = invoke_gadget(
                SignedModulus::new(F::FIELD_MODULUS, 16),
                &[x.ids[0], m.ids[0]],
            );

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

        let test_case = |x: i64, m: i64, expected_q: i64, expected_r: i64, expect_success: bool| {
            let result = runtime.prove(
                prog,
                vec![],
                vec![],
                vec![
                    BpField::from(x),
                    BpField::from(m),
                    BpField::from(expected_q),
                    BpField::from(expected_r),
                ],
            );

            let proof = if expect_success {
                result.unwrap()
            } else {
                assert!(result.is_err());
                return;
            };

            runtime
                .verify(prog, &proof, vec![], Vec::<ZkpProgramInput>::new())
                .unwrap();
        };

        // 2 * 22 + 3 == 47
        test_case(47, 22, 2, 3, true);

        // -3 * 22 + 19 == -47
        test_case(-47, 22, -3, 19, true);

        // Divide by zero error
        test_case(4, 0, 0, 0, false);
    }
}
