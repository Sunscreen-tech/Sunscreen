use ark_ff::Field;
use ark_poly::{univariate::DensePolynomial, Polynomial};
use bitvec::slice::BitSlice;
use curve25519_dalek::scalar::Scalar;

use crate::{
    crypto::CryptoHash,
    fields::{FieldFrom, FieldInto, FpRistretto},
    linear_algebra::{
        HadamardProduct, Identity, InnerProduct, Matrix, PolynomialMatrix, ScalarMul,
    },
    linear_relation::ProverKnowledge,
    math::{FieldModulus, ModSwitch, One, Powers, Tensor, TwosComplementCoeffs, Zero},
};

#[allow(unused)]
pub mod linear_relation {
    use super::*;

    /**
     * Asserts A(a)S(a) + qR_1(a) + f(a)R_2(a) == T(a) over Z_p[X].
     */
    pub fn assert_eval<Q>(
        pk: &ProverKnowledge<Q>,
        r_1: &PolynomialMatrix<FpRistretto>,
        r_2: &PolynomialMatrix<Q>,
        alpha: &Scalar,
    ) where
        Q: Field + CryptoHash + ModSwitch<FpRistretto> + FieldModulus<4>,
    {
        let vk = &pk.vk;

        let f = vk.f.mod_switch_signed();
        let a = vk.a.mod_switch_signed();
        let s = pk.s.mod_switch_signed();
        let r_2 = r_2.mod_switch_signed();
        let t = vk.t.mod_switch_signed();

        let q = FpRistretto::from(Q::field_modulus());

        let alpha: FpRistretto = (*alpha).field_into();

        let a_eval = a.evaluate(&alpha);
        let s_eval = s.mod_switch_signed().evaluate(&alpha);
        let r_1_eval = r_1.evaluate(&alpha);
        let r_2_eval = r_2.evaluate(&alpha);
        let f_eval = f.evaluate(&alpha);
        let t_eval = t.evaluate(&alpha);

        let lhs = a_eval * s_eval + r_1_eval.scalar_mul(q) + r_2_eval.scalar_mul(f_eval);

        assert_eq!(lhs, t_eval);
    }

    /**
     * Asserts the factor computation is correct.
     */
    pub fn assert_factors<Q>(
        pk: &ProverKnowledge<Q>,
        f: &DensePolynomial<Q>,
        r_2: &PolynomialMatrix<Q>,
        r_1: &PolynomialMatrix<FpRistretto>,
    ) where
        Q: Field + FieldModulus<4> + ModSwitch<FpRistretto> + CryptoHash + Zero,
    {
        let vk = &pk.vk;

        let q = FpRistretto::from(Q::field_modulus());

        // The below objects are in Z_q[X], so we need to raise them to Z_p[X]
        let f = f.mod_switch_signed();
        let r_2 = r_2.mod_switch_signed();
        let a = vk.a.mod_switch_signed();
        let s = pk.s.mod_switch_signed();

        let lhs = a * s + r_1.scalar_mul_q(&q) + r_2.scalar_mul(&f);

        assert_eq!(lhs, vk.t.mod_switch_signed());
    }

    /**
     * Asserts that A(a)S(I (x) a) + qR_1(I (x) a) + f(a)R_2(I_k (x) a) = T(a).
     *
     * # Remarks
     * This is the identity in equation 18 in the short discrete log paper.
     * See that for more details and subscripts, hats, etc.
     */
    pub fn assert_poly_expansion<Q>(
        pk: &ProverKnowledge<Q>,
        s: &[FpRistretto],
        r_1: &[FpRistretto],
        r_2: &[FpRistretto],
        alpha: &Scalar,
    ) where
        Q: Field + FieldModulus<4> + ModSwitch<FpRistretto> + CryptoHash + Zero,
    {
        let vk = &pk.vk;
        let m = vk.m() as usize;
        let n = vk.n() as usize;
        let k = vk.k() as usize;
        let d = vk.d() as usize;
        let f = &vk.f;
        let t = vk.t.mod_switch_signed();

        let s = Matrix::from((m, k * d, s));
        let r_1 = Matrix::from((n, k * (2 * d - 1), r_1));
        let r_2 = Matrix::from((n, k * (d - 1), r_2));

        let q = FpRistretto::from(Q::field_modulus());

        // The below objects are in Z_q[X], so we need to raise them to Z_p[X]
        let f = f.mod_switch_signed();
        let a = vk.a.mod_switch_signed();

        let alpha: FpRistretto = (*alpha).field_into();
        let alpha_d = alpha.powers(d);
        let alpha_2d_min_1 = alpha.powers(2 * d - 1);
        let alpha_d_min_1 = alpha.powers(d - 1);

        let i = Matrix::<FpRistretto>::identity(k);

        let a_eval = a.evaluate(&alpha);
        let f_eval = f.evaluate(&alpha);

        let lhs = a_eval * s * Matrix::from((&i).tensor(alpha_d))
            + r_1.scalar_mul(q) * Matrix::from((&i).tensor(alpha_2d_min_1))
            + r_2.scalar_mul(f_eval) * Matrix::from((&i).tensor(alpha_d_min_1));

        assert_eq!(lhs, t.evaluate(&alpha));
    }

    /**
     * Asserts the first identity after equation 18 in the short discrete
     * log proof paper. I.e., multiply both sides by gamma transpose and
     * beta.
     */
    pub fn assert_scaled_poly_expansion<Q>(
        pk: &ProverKnowledge<Q>,
        s: &[FpRistretto],
        r_1: &[FpRistretto],
        r_2: &[FpRistretto],
        alpha: &Scalar,
        beta: &[Scalar],
        gamma: &[Scalar],
    ) where
        Q: Field + FieldModulus<4> + ModSwitch<FpRistretto> + CryptoHash + Zero,
    {
        type Fp = FpRistretto;

        let vk = &pk.vk;
        let m = vk.m() as usize;
        let n = vk.n() as usize;
        let k = vk.k() as usize;
        let d = vk.d() as usize;
        let f = &vk.f;
        let t = vk.t.mod_switch_signed();

        let s = Matrix::from((m, k * d, s));
        let r_1 = Matrix::from((n, k * (2 * d - 1), r_1));
        let r_2 = Matrix::from((n, k * (d - 1), r_2));

        let q = Fp::from(Q::field_modulus());

        // The below objects are in Z_q[X], so we need to raise them to Z_p[X]
        let f = f.mod_switch_signed();
        let a = vk.a.mod_switch_signed();

        let alpha: Fp = (*alpha).field_into();
        let alpha_d = alpha.powers(d);
        let alpha_2d_min_1 = alpha.powers(2 * d - 1);
        let alpha_d_min_1 = alpha.powers(d - 1);

        let beta = beta.iter().map(|x| (*x).field_into()).collect::<Vec<Fp>>();
        let gamma = gamma
            .iter()
            .map(|x| Fp::field_from(*x))
            .collect::<Vec<Fp>>();
        let gamma_t = Matrix::from(gamma).transpose();

        let a_eval = a.evaluate(&alpha);
        let f_eval = f.evaluate(&alpha);

        let lhs = &gamma_t * a_eval * s * Matrix::from(beta.as_slice().tensor(alpha_d))
            + &gamma_t * r_1.scalar_mul(q) * Matrix::from(beta.as_slice().tensor(alpha_2d_min_1))
            + &gamma_t
                * r_2.scalar_mul(f_eval)
                * Matrix::from(beta.as_slice().tensor(alpha_d_min_1));

        let rhs = &gamma_t * t.evaluate(&alpha) * Matrix::from(beta.as_slice());

        assert_eq!(lhs, rhs);
    }

    pub fn assert_inner_product_form<Q>(
        pk: &ProverKnowledge<Q>,
        s: &[FpRistretto],
        r_1: &[FpRistretto],
        r_2: &[FpRistretto],
        alpha: &Scalar,
        beta: &[Scalar],
        gamma: &[Scalar],
    ) where
        Q: Field + FieldModulus<4> + ModSwitch<FpRistretto> + CryptoHash + Zero,
    {
        type Fp = FpRistretto;

        let vk = &pk.vk;
        let d = vk.d() as usize;
        let f = &vk.f;
        let t = vk.t.mod_switch_signed();

        let q = Fp::from(Q::field_modulus());

        // The below objects are in Z_q[X], so we need to raise them to Z_p[X]
        let f = f.mod_switch_signed();
        let a = vk.a.mod_switch_signed();

        let alpha: Fp = (*alpha).field_into();
        let alpha_d = alpha.powers(d);
        let alpha_2d_min_1 = alpha.powers(2 * d - 1);
        let alpha_d_min_1 = alpha.powers(d - 1);

        let beta = beta.iter().map(|x| (*x).field_into()).collect::<Vec<Fp>>();
        let gamma = gamma
            .iter()
            .map(|x| Fp::field_from(*x))
            .collect::<Vec<Fp>>();
        let gamma_t = Matrix::from(gamma.as_slice()).transpose();

        let a_eval = a.evaluate(&alpha);
        let f_eval = f.evaluate(&alpha);

        // Compute the first inner product term.
        let term_1 = (a_eval.transpose() * Matrix::from(gamma.as_slice()))
            .tensor(beta.as_slice().tensor(alpha_d));

        let term_1 = term_1.inner_product(s);

        // Compute the second inner product term.
        let term_2 = gamma
            .as_slice()
            .scalar_mul(q)
            .tensor(beta.as_slice())
            .tensor(alpha_2d_min_1);

        let term_2 = term_2.inner_product(r_1);

        // Compute the third inner product term.
        let term_3 = gamma
            .scalar_mul(f_eval)
            .tensor(beta.as_slice())
            .tensor(alpha_d_min_1);

        let term_3 = term_3.inner_product(r_2);

        let lhs = term_1 + term_2 + term_3;

        let rhs = &gamma_t * t.evaluate(&alpha) * Matrix::from(beta.as_slice());

        assert_eq!(rhs.rows, 1);
        assert_eq!(rhs.cols, 1);

        assert_eq!(lhs, rhs[(0, 0)]);
    }

    /**
     * Asserts that equation 19 in short discrete log proof paper holds.
     *
     * # Remarks
     * The identity is given below (compile docs with mathjax support to view):
     *
     * $
     * \left<\mathbf{A}(\alpha)^T \vec{\gamma} \otimes \vec{\beta} \otimes \vec{\alpha}_d \otimes \vec{2}_b, \mathrm{Binary}_b(\vec{s})\right>
     * + \left<q\vec{\gamma} \otimes \vec{\beta} \otimes \vec{\alpha}_{2d-1} \otimes \vec{2}_{b_1}, \mathrm{Binary}_{b_1}(\vec{r_1}) \right>
     * + \left< \mathbf{f}(\alpha)\vec{\gamma} \otimes \vec{\beta} \otimes \vec{\alpha}_{d-1} \otimes \vec{2}_{b_2}, \mathrm{Binary}_{b_2}(\vec{r_2}) \right>
     * = \vec{\gamma}^T \mathbf{T}(\alpha)\vec{\beta}
     * $
     */
    pub fn assert_equation_19<Q>(
        pk: &ProverKnowledge<Q>,
        s_binary: &BitSlice,
        r_1_binary: &BitSlice,
        r_2_binary: &BitSlice,
        alpha: &Scalar,
        beta: &[Scalar],
        gamma: &[Scalar],
    ) where
        Q: Field + FieldModulus<4> + ModSwitch<FpRistretto> + CryptoHash + Zero,
    {
        type Fp = FpRistretto;

        let vk = &pk.vk;
        let d = vk.d() as usize;
        let b = vk.b() as usize;
        let b_1 = vk.b_1() as usize;
        let b_2 = vk.b_2() as usize;
        let f = vk.f.mod_switch_signed();
        let t = vk.t.mod_switch_signed();
        let a = vk.a.mod_switch_signed();
        let q = Fp::from(Q::field_modulus());

        let alpha = Fp::field_from(*alpha);
        let alpha_d = alpha.powers(d);
        let alpha_2d_min_1 = alpha.powers(2 * d - 1);
        let alpha_d_min_1 = alpha.powers(d - 1);
        let two_b = Fp::twos_complement_coeffs(b);
        let two_b_1 = Fp::twos_complement_coeffs(b_1);
        let two_b_2 = Fp::twos_complement_coeffs(b_2);

        let gamma = gamma.iter().map(|x| (*x).field_into()).collect::<Vec<Fp>>();
        let gamma = gamma.as_slice();
        let beta = beta.iter().map(|x| (*x).field_into()).collect::<Vec<Fp>>();
        let beta = beta.as_slice();

        // Compute LHS term 1
        let a_eval_t = a.evaluate(&alpha).transpose();
        let f_eval = f.evaluate(&alpha);
        let t_eval = t.evaluate(&alpha);

        let term_1 = (a_eval_t * Matrix::from(gamma))
            .tensor(beta)
            .tensor(alpha_d)
            .tensor(two_b);
        let term_1 = s_binary.inner_product(&term_1);

        // Compute LHS term 2
        let term_2 = gamma
            .scalar_mul(q)
            .tensor(beta)
            .tensor(alpha_2d_min_1)
            .tensor(two_b_1);

        let term_2 = r_1_binary.inner_product(&term_2);

        // Compute LHS term 3
        let term_3 = gamma
            .scalar_mul(f_eval)
            .tensor(beta)
            .tensor(alpha_d_min_1)
            .tensor(two_b_2);

        let term_3 = r_2_binary.inner_product(&term_3);

        let lhs = term_1 + term_2 + term_3;

        let rhs = Matrix::from(gamma).transpose() * t_eval * Matrix::from(beta);
        assert_eq!(rhs.rows, 1);
        assert_eq!(rhs.cols, 1);

        assert_eq!(lhs, rhs[(0, 0)]);
    }

    pub fn assert_2s_complement_tensor_expansion<Q>(
        pk: &ProverKnowledge<Q>,
        s_binary: &BitSlice,
        r_1_binary: &BitSlice,
        r_2_binary: &BitSlice,
        s_serialized: &[FpRistretto],
        r_1_serialized: &[FpRistretto],
        r_2_serialized: &[FpRistretto],
    ) where
        Q: Field + FieldModulus<4> + ModSwitch<FpRistretto> + CryptoHash + Zero,
    {
        let b = pk.vk.b() as usize;
        let b_1 = pk.vk.b_1() as usize;
        let b_2 = pk.vk.b_2() as usize;

        let two_b = FpRistretto::twos_complement_coeffs(b).repeat(s_serialized.len());
        let two_b_1 = FpRistretto::twos_complement_coeffs(b_1).repeat(r_1_serialized.len());
        let two_b_2 = FpRistretto::twos_complement_coeffs(b_2).repeat(r_2_serialized.len());

        let s_actual = s_binary.inner_product(&two_b);
        let r_1_actual = r_1_binary.inner_product(&two_b_1);
        let r_2_actual = r_2_binary.inner_product(&two_b_2);

        let s_expected = s_serialized.iter().fold(FpRistretto::zero(), |s, v| s + v);
        let r_1_expected = r_1_serialized
            .iter()
            .fold(FpRistretto::zero(), |s, v| s + v);
        let r_2_expected = r_2_serialized
            .iter()
            .fold(FpRistretto::zero(), |s, v| s + v);

        assert_eq!(s_actual, s_expected);
        assert_eq!(r_1_actual, r_1_expected);
        assert_eq!(r_2_actual, r_2_expected);
    }

    /**
     * Asserts the equation after 19 holds.
     */
    pub fn assert_equation_19_plus_1<Q>(
        pk: &ProverKnowledge<Q>,
        v: &[Scalar],
        s_1: &BitSlice,
        alpha: &Scalar,
        beta: &[Scalar],
        gamma: &[Scalar],
    ) where
        Q: Field + FieldModulus<4> + ModSwitch<FpRistretto> + CryptoHash + Zero,
    {
        type Fp = FpRistretto;

        let vk = &pk.vk;

        let v: Vec<Fp> = v.field_into();
        let alpha: Fp = (*alpha).field_into();
        let beta: Vec<Fp> = beta.field_into();
        let gamma: Vec<Fp> = gamma.field_into();
        let t = pk.vk.t.mod_switch_signed();

        let s_1 = s_1
            .iter()
            .map(|x| if *x { Fp::one() } else { Fp::zero() })
            .collect::<Vec<Fp>>();

        let lhs = v.inner_product(s_1);

        let gamma_t = Matrix::from(gamma).transpose();
        let t_eval = t.evaluate(&alpha);

        let rhs = gamma_t * t_eval * Matrix::from(beta);
        assert_eq!(rhs.rows, 1);
        assert_eq!(rhs.cols, 1);
        let rhs = rhs[(0, 0)];

        assert_eq!(lhs, rhs);
    }

    #[allow(clippy::too_many_arguments)]
    /**
     * Asserts the equation 2 after equation 19 holds.
     *
     * # Remarks
     * The identity is given below (compile docs with mathjax support to view):
     * $\left<
     * \vec{v}+\vec{\varphi} \circ \vec{s_2} + \psi\vec{\varphi},
     * s_1 + \psi\vec{1}
     * \right>
     * = \vec{\gamma}^T \mathbf{T}(\alpha)\vec{\beta}
     * + \psi \left< \vec{v}, \vec{1}\right>
     * + (\psi + \psi^2)\left<\vec{\varphi}, \vec{1} \right>$
     */
    pub fn assert_equation_19_plus_2<Q>(
        pk: &ProverKnowledge<Q>,
        v: &[Scalar],
        s_2: &BitSlice,
        s_1: &BitSlice,
        alpha: &Scalar,
        beta: &[Scalar],
        psi: &Scalar,
        phi: &[Scalar],
        gamma: &[Scalar],
    ) where
        Q: Field + FieldModulus<4> + ModSwitch<FpRistretto> + CryptoHash + Zero,
    {
        type Fp = FpRistretto;

        let v: Vec<Fp> = v.field_into();
        let alpha: Fp = (*alpha).field_into();
        let beta: Vec<Fp> = beta.field_into();
        let phi: Vec<Fp> = phi.field_into();
        let phi = phi.as_slice();
        let gamma: Vec<Fp> = gamma.field_into();
        let psi: Fp = (*psi).field_into();
        let t = pk.vk.t.mod_switch_signed();

        let s_1 = s_1
            .iter()
            .map(|x| if *x { Fp::one() } else { Fp::zero() })
            .collect::<Vec<Fp>>();

        let lhs_1: Matrix<Fp> = Matrix::from(v.as_slice())
            + Matrix::from(phi.hadamard_product(s_2))
            + Matrix::from(phi.scalar_mul(psi));

        let lhs_2: Matrix<Fp> = Matrix::from(s_1.as_slice()) + Matrix::from(vec![psi; s_1.len()]);

        let lhs = lhs_1.as_slice().inner_product(lhs_2.as_slice());

        let t_eval = t.evaluate(&alpha);

        let rhs_1 = Matrix::from(gamma).transpose() * t_eval * Matrix::from(beta);
        assert_eq!(rhs_1.rows, 1);
        assert_eq!(rhs_1.cols, 1);
        let rhs_1 = rhs_1[(0, 0)];

        let rhs_2 =
            Matrix::from(v.as_slice()).inner_product(&Matrix::from(vec![Fp::one(); v.len()])) * psi;

        let rhs_3 = (psi + psi * psi)
            * Matrix::from(phi).inner_product(&Matrix::from(vec![Fp::one(); phi.len()]));

        let rhs = rhs_1 + rhs_2 + rhs_3;

        assert_eq!(lhs, rhs);
    }
}
