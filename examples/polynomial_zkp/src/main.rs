use std::array;

use sunscreen::{
    bulletproofs::BulletproofsBackend,
    types::zkp::{
        AddVar, BigInt, BulletproofsField, Coerce, Field, MulVar, NumFieldElements, ProgramNode,
        SubVar, ToNativeFields,
    },
    zkp::{with_zkp_ctx, ZkpContextOps},
    zkp_program, zkp_var, Compiler, Error, FieldSpec, TypeName, ZkpBackend, ZkpRuntime,
};

/// A quotient polynomial over native field elements.
///
/// This is a polynomial over the quotient ring `Z[x]/(x^N + 1)`. Polynomial quotient rings are
/// very common in the lattice cryptography undergirding FHE, so this is a structure we're
/// particularly interested in.
///
/// The quotient ring is actually quite simple. Polynomials `p(x)` behave just like they do
/// in`Z[x]`, but they are reduced modulo `x^N + 1`. This is similar to modular arithmetic, where
/// numbers in `Z_q` behave just like those in `Z`, but you reduce numbers `n` greater than `q` to
/// `n mod q`. The only difference is here, instead of taking the remainder of `n` divided by `q`,
/// you take the remainder of `p(x)` divided by `x^N + 1`. Long division with polynomials is
/// typically rather tedious, but lucky for us, the divisor polynomial `x^N + 1` has a _really_
/// nice property. All you have to do is replace every factor of `x^N` with `-1` in `p(x)`!
///
/// Let's try an example. Suppose `p(x) = (x^4 - 4)` and `q(x) = (x^2 - 3)` are polynomials in
/// `Z[x]/(x^5 + 1)`. Then
///
/// ```ignore
/// p(x) * q(x) = (x^4 - 4) * (x^2 - 3)
///             = x^6 - 3x^4 - 4x^2 + 12
///             = -x - 3x^4 - 4x^2 + 12
///             = -3x^4 - 4x^2 - x + 12
/// ```
///
/// Pretty easy, right?
///
/// We represent the polynomial here as an array of coefficients, ordered from least significant to
/// most significant.
#[derive(Debug, Copy, Clone, TypeName)]
pub struct Polynomial<F: FieldSpec, const N: usize> {
    coefficients: [Field<F>; N],
}

// To use our `Polynomial` in ZKP programs, we have to satisfy the `Polynomial: ZkpType`
// constraint. This is equivalent to providing impls for `TypeName`, `NumFieldElements`, and
// `ToNativeFields`. The first we are able to #[derive()].

// The second one is trivial.
impl<F: FieldSpec, const N: usize> NumFieldElements for Polynomial<F, N> {
    const NUM_NATIVE_FIELD_ELEMENTS: usize = N;
}

// The last one is also fairly trivial! We just need to package up our representation into an
// ordered list of the `BigInt`s underlying the `Field<F>`.
impl<F: FieldSpec, const N: usize> ToNativeFields for Polynomial<F, N> {
    fn to_native_fields(&self) -> Vec<BigInt> {
        self.coefficients.map(|x| x.val).into_iter().collect()
    }
}

// However, if you try to use the polynomial now, you'll find it is not incredibly useful. We need
// to implement some arithmetic traits to be able to add, subtract, and multiply elements of this
// type.

// Addition is quite simple, we just add the corresponding coefficients together.
impl<F: FieldSpec, const N: usize> AddVar for Polynomial<F, N> {
    fn add(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        let mut coeff_node_indices = vec![];

        with_zkp_ctx(|ctx| {
            for (left, right) in lhs.ids.iter().zip(rhs.ids) {
                coeff_node_indices.push(ctx.add_addition(*left, *right));
            }
        });

        Self::coerce(&coeff_node_indices)
    }
}

// Similarly for subtraction.
impl<F: FieldSpec, const N: usize> SubVar for Polynomial<F, N> {
    fn sub(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        let mut coeff_node_indices = vec![];

        with_zkp_ctx(|ctx| {
            for (left, right) in lhs.ids.iter().zip(rhs.ids) {
                coeff_node_indices.push(ctx.add_subtraction(*left, *right));
            }
        });

        Self::coerce(&coeff_node_indices)
    }
}

// Multiplication is a little more involved, but generally we just follow the logic described in
// the quotient ring above.
impl<F: FieldSpec, const N: usize> MulVar for Polynomial<F, N> {
    fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        let mut output_coeffs = vec![];

        with_zkp_ctx(|ctx| {
            // We'll start with the zero polynomial, and add to each coefficient as we go
            output_coeffs = vec![ctx.add_constant(&BigInt::ZERO); N];

            // When multiplying (a_i x^i) * (b_j x^j), we get a (a_i * b_j) addend for the
            // `x^{i+j}` coefficient
            for i in 0..N {
                for j in 0..N {
                    // But! Recall we reduce any x^{i+j} to x^{(i+j) % N} in the quotient ring
                    let coeff_index = (i + j) % N;

                    // Next let's multiply (a_i * b_j)
                    let coeffs_mul = ctx.add_multiplication(lhs.ids[i], rhs.ids[j]);

                    // If (i + j) >= N, we have to add the -1 factor
                    let coeff_addend = if i + j >= N {
                        ctx.add_negate(coeffs_mul)
                    } else {
                        coeffs_mul
                    };

                    // Finally, let's add it to our running total for that coefficient
                    output_coeffs[coeff_index] =
                        ctx.add_addition(output_coeffs[coeff_index], coeff_addend);
                }
            }
        });

        Self::coerce(&output_coeffs)
    }
}

// Next we'll add a few convenient methods for constructing polynomials within ZKP programs

impl<F: FieldSpec, const N: usize> Polynomial<F, N> {
    /// Create the zero polynomial.
    pub fn zero() -> ProgramNode<Self> {
        let zero = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ZERO));
        ProgramNode::new(&[zero; N])
    }

    /// Create the polynomial `1`, i.e. the polynomial with zero coefficients everywhere except
    /// for the coefficient `1` at `x^0`.
    pub fn one() -> ProgramNode<Self> {
        let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap();
        let one = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ONE));
        poly_ids[0] = one;
        ProgramNode::new(&poly_ids)
    }

    /// Create the polynomial `x`, i.e. the polynomial with zero coefficients everywhere except
    /// for the coefficient `1` at `x^1`.
    pub fn x() -> ProgramNode<Self> {
        let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap();
        let one = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ONE));
        poly_ids[1] = one;
        ProgramNode::new(&poly_ids)
    }

    /// Make a scalar polynomial, i.e. the polynomial with zero coefficients everywhere except for
    /// the coefficient `scalar` at `x^0`.
    pub fn scalar<S>(scalar: S) -> ProgramNode<Self>
    where
        S: Into<ProgramNode<Field<F>>>,
    {
        let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap();
        poly_ids[0] = scalar.into().ids[0];
        ProgramNode::new(&poly_ids)
    }

    /// Make a root polynomial `(x - root)`
    pub fn root<S>(root: S) -> ProgramNode<Self>
    where
        S: Into<ProgramNode<Field<F>>>,
    {
        let x = Self::x();
        let r = Self::scalar(root);
        x - r
    }
}
// One last thing that will be nice for users is an easy way to construct `Polynomial` inputs
// to ZKP programs

/// Create a `Polynomial` from an array of coefficients beloning to a particular ZKP backend.
pub fn from_coefficients<B: ZkpBackend, const N: usize, I>(
    coeffs: [I; N],
) -> Polynomial<B::Field, N>
where
    Field<B::Field>: From<I>,
{
    Polynomial {
        coefficients: coeffs.map(Field::from),
    }
}

// Notice we want to define the evaluate function not on the `Polynomial` itself, but rather the
// `ProgramNode`.

pub trait Evaluate<F: FieldSpec> {
    fn evaluate<S>(&self, point: S) -> ProgramNode<Field<F>>
    where
        S: Into<ProgramNode<Field<F>>>;
}

impl<F: FieldSpec, const N: usize> Evaluate<F> for ProgramNode<Polynomial<F, N>> {
    /// Evaluate the polynomial at `point`
    fn evaluate<S>(&self, point: S) -> ProgramNode<Field<F>>
    where
        S: Into<ProgramNode<Field<F>>>,
    {
        let point = point.into().ids[0];
        let node_index = with_zkp_ctx(|ctx| {
            let mut result = ctx.add_constant(&BigInt::ZERO);
            let mut pow = ctx.add_constant(&BigInt::ONE);
            for coeff in self.ids {
                let addend = ctx.add_multiplication(pow, *coeff);
                result = ctx.add_addition(result, addend);
                pow = ctx.add_multiplication(pow, point);
            }
            result
        });

        ProgramNode::new(&[node_index])
    }
}

// Finally, let's use our polynomial!

#[zkp_program]
pub fn one_of<F: FieldSpec>(x: Field<F>, #[public] list: [Field<F>; 5]) {
    // Let's build up a polynomial by roots
    // Note we want to allow degree 5, so we want a ring modulo x^{6}
    let mut poly = Polynomial::<F, 6>::one();
    for elem in list {
        poly = poly * Polynomial::root(elem);
    }

    // If x is in the list, then it is a root of the polynomial
    poly.evaluate(x).constrain_eq(zkp_var!(0));
}

// We can also use polynomials as arguments

#[zkp_program]
pub fn private_eval<F: FieldSpec>(
    eval: Field<F>,
    point: Field<F>,
    #[public] poly: Polynomial<F, 10>,
) {
    poly.evaluate(point).constrain_eq(eval);
}

fn main() -> Result<(), Error> {
    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(one_of)
        .zkp_program(private_eval)
        .compile()?;
    let runtime = ZkpRuntime::new(BulletproofsBackend::new())?;

    // Let's test our `one_of` ZKP works as expected

    let one_of_zkp = app.get_zkp_program(one_of).unwrap();

    let x = BulletproofsField::from(12345);
    let list: [_; 5] = array::from_fn(|i| BulletproofsField::from(12343 + i as u32));

    let proof = runtime
        .proof_builder(one_of_zkp)
        .private_input(x)
        .public_input(list)
        .prove()?;
    runtime
        .verification_builder(one_of_zkp)
        .proof(&proof)
        .public_input(list)
        .verify()?;

    // Next let's try out `private_eval`

    let private_eval_zkp = app.get_zkp_program(private_eval).unwrap();

    let poly = from_coefficients::<BulletproofsBackend, 10, _>([1, 42, 0, 0, 0, 3, 0, 0, 0, 0]);
    let point = BulletproofsField::from(2);
    // At point 2, the poly should be equal to 1 + 42 * 2 + 3 * 32 = 181
    let eval = BulletproofsField::from(1 + 42 * 2 + 3 * 32);

    let proof = runtime
        .proof_builder(private_eval_zkp)
        .private_input(eval)
        .private_input(point)
        .public_input(poly)
        .prove()?;
    runtime
        .verification_builder(private_eval_zkp)
        .proof(&proof)
        .public_input(poly)
        .verify()?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use sunscreen::ZkpProgramFnExt;

    use super::*;

    #[test]
    fn main_works() -> Result<(), Error> {
        main()
    }

    #[test]
    fn one_of_failure() -> Result<(), Error> {
        let one_of_zkp = one_of.compile::<BulletproofsBackend>()?;
        let runtime = one_of.runtime::<BulletproofsBackend>()?;

        let x = BulletproofsField::from(12345);
        let list: [_; 5] = array::from_fn(|i| BulletproofsField::from(12346 + i as u32));

        let proof = runtime
            .proof_builder(&one_of_zkp)
            .private_input(x)
            .public_input(list)
            .prove();

        assert!(proof.is_err());
        Ok(())
    }

    #[test]
    fn eval_poly_failure() -> Result<(), Error> {
        let private_eval_zkp = private_eval.compile::<BulletproofsBackend>()?;
        let runtime = private_eval.runtime::<BulletproofsBackend>()?;

        let poly = from_coefficients::<BulletproofsBackend, 10, _>([1, 42, 0, 0, 0, 3, 0, 0, 0, 0]);
        // Eval point 3 instead of point 2
        let point = BulletproofsField::from(3);
        let eval = BulletproofsField::from(1 + 42 * 2 + 3 * 32);

        let proof = runtime
            .proof_builder(&private_eval_zkp)
            .private_input(eval)
            .private_input(point)
            .public_input(poly)
            .prove();

        assert!(proof.is_err());
        Ok(())
    }
}
