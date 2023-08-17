# Custom ZKP types

So far, all of our ZKP program arguments have had type `Field<F>`.
However, this doesn't have to be the case! You can use other argument types, as
long as they implement the [`ZkpType`][zkp-type] trait.

We've seen throughout the documentation that polynomials are incredibly useful
for expressing constraints. So let's make a custom ZKP type that makes
polynomials easier to use!

## Motivating the need for custom ZKP types
In this section we'll see how to define a polynomial type.

Our polynomials will exist in
the _quotient ring_ \\(\mathbb{Z}[x]/(x^N + 1) \\).  Polynomial quotient rings are very
common in lattice cryptography (and thus FHE[^mod-q]), so this is a structure
we're particularly interested in as we think about linking together our FHE and ZKP compilers.[^rns]

In our polynomial quotient ring, we're able to add and multiply polynomials together. However, arithmetic behaves slightly differently here. Namely, the degree of the polynomial will wrap around N (the coefficients _won't_ wrap however). Let's explain this in a bit more detail.

Polynomials \\(p(x) \in \mathbb{Z}/(x^N + 1)\\) behave just
like they do in \\(\mathbb{Z}[x]\\), but they are reduced modulo \\(x^N + 1\\).
This is similar to modular/clock arithmetic, where numbers in \\(\mathbb{Z}_q\\)
behave just like those in \\(\mathbb{Z}\\) but you reduce numbers \\(\mod q\\). For example, 7 in \\(\mathbb{Z}_3\\) wraps around to become 1. 

The only difference is here is that you take the remainder of
\\(p(x)\\) divided by \\(x^N + 1\\). Long division with polynomials is typically
rather tedious, but lucky for us, the divisor polynomial \\(x^N + 1\\) has a
_really_ nice property. All you have to do is replace every factor of \\(x^N\\)
with \\(-1\\) in \\(p(x)\\)! That is, for every term with an exponent \\(m >
N\\), reduce the exponent to \\(m \mod N\\) and stick a minus sign in front of
the coefficient.

For example, suppose \\(p(x) = (x^4 - 4)\\) and \\(q(x) = (x^2 - 3)\\) are polynomials in
\\(\mathbb{Z}[x]/(x^5 + 1)\\). Then

\\[
\begin{align*}
p(x) * q(x) &= (x^4 - 4) * (x^2 - 3) \\\\
            &= x^6 - 3x^4 - 4x^2 + 12 \\\\
            &= -x - 3x^4 - 4x^2 + 12 \\\\
            &= -3x^4 - 4x^2 - x + 12 \\\\
\end{align*}
\\]

## Type definition

Let's get our imports out of the way; there are quite a few for implementing a
custom ZKP type!

```rust
use sunscreen::{
    bulletproofs::BulletproofsBackend,
    types::zkp::{
        AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec,
        NumFieldElements, ProgramNode, SubVar, ToNativeFields,
    },
    zkp::{with_zkp_ctx, ZkpContextOps},
    zkp_program, zkp_var, Compiler, Error,
    TypeName, ZkpBackend, ZkpRuntime,
};
```

Next, we'll define the polynomial type. Our polynomial will actually exist in
the _quotient ring_ \\(\mathbb{Z}[x]/(x^N + 1) \\). 

We represent the polynomial here as an array of coefficients, ordered from least significant (smallest degree) to
most significant (largest degree).

```rust,ignore
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
#
#[derive(Debug, Copy, Clone, TypeName)]
pub struct Polynomial<F: FieldSpec, const N: usize> {
    coefficients: [Field<F>; N],
}
```

## Implementing `ZkpType`

To use our `Polynomial` in ZKP programs, we have to satisfy the `Polynomial: ZkpType`
constraint. This is equivalent to providing impls for `TypeName`, `NumFieldElements`, and
`ToNativeFields`. 

The first we were able to derive on the type definition. The second one is trivial; our polynomial has `N` field elements, so `NUM_NATIVE_FIELD_ELEMENTS` is simply `N`:

```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeName for Polynomial<F, N> { fn type_name() -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..Field::<F>::type_name() } } }
#
impl<F: FieldSpec, const N: usize> NumFieldElements for Polynomial<F, N> {
    const NUM_NATIVE_FIELD_ELEMENTS: usize = N;
}
```

The last one is also fairly trivial! We just need to package up our
representation into an ordered list of the `BigInt`s underlying the
`Field<F>`.

```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeName for Polynomial<F, N> { fn type_name() -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..Field::<F>::type_name() } } }
#
impl<F: FieldSpec, const N: usize> ToNativeFields for Polynomial<F, N> {
    fn to_native_fields(&self) -> Vec<BigInt> {
        self.coefficients.map(|x| x.val).into_iter().collect()
    }
}
```

These returned values must be less than `F::FIELD_MODULUS`, or users will get an
out of range error.

## Implementing arithmetic

If you try to use the polynomial now, you'll find it is not particularly
useful. We need to implement some arithmetic traits to be able to add, subtract,
and multiply elements of this type together. To be specific, we need to
implement `types::zkp{AddVar, SubVar, MulVar}` respectively.[^forein-trait]

But first, we need to briefly touch on some implementation details of our
compiler. We represent your compiled ZKP program as a graph of program nodes. A
`ProgramNode<T>` holds type information in `T`, but otherwise contains a single
`ids: &[NodeIndex]` field, which contains graph node indices. These `ids` are
how we refer to nodes in the arithmetic circuit underlying the ZKP program.
While native field elements will always have just one node index, others may
contain more. In fact, this is precisely what we specified above when
implementing `NumFieldElements`! Namely, that our polynomial variables will
contain `N` node indices.

Also, recall from the previous section that `with_zkp_ctx` is the function we
use to add operations to the graph context. The graph `ctx` variable contains the
arithmetic circuit being constructed as we compile a user's program, and with it
we can add operations like addition, subtraction, and multiplication. Note that
you cannot nest calls to `with_zkp_ctx`, or you'll get a panic!

Addition is straightforward as we just add the corresponding coefficients
together:

```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeName for Polynomial<F, N> { fn type_name() -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..Field::<F>::type_name() } } }
# impl<F: FieldSpec, const N: usize> NumFieldElements for Polynomial<F, N> { const NUM_NATIVE_FIELD_ELEMENTS: usize = N; }
# impl<F: FieldSpec, const N: usize> ToNativeFields for Polynomial<F, N> { fn to_native_fields(&self) -> Vec<BigInt> { self.coefficients.map(|x| x.val).into_iter().collect() } }
#
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
```

Similarly, for subtraction:

```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeName for Polynomial<F, N> { fn type_name() -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..Field::<F>::type_name() } } }
# impl<F: FieldSpec, const N: usize> NumFieldElements for Polynomial<F, N> { const NUM_NATIVE_FIELD_ELEMENTS: usize = N; }
# impl<F: FieldSpec, const N: usize> ToNativeFields for Polynomial<F, N> { fn to_native_fields(&self) -> Vec<BigInt> { self.coefficients.map(|x| x.val).into_iter().collect() } }
#
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
```

Multiplication is a little more involved[^mult-const], but generally we just follow the logic described in
the quotient ring description above.

```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeName for Polynomial<F, N> { fn type_name() -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..Field::<F>::type_name() } } }
# impl<F: FieldSpec, const N: usize> NumFieldElements for Polynomial<F, N> { const NUM_NATIVE_FIELD_ELEMENTS: usize = N; }
# impl<F: FieldSpec, const N: usize> ToNativeFields for Polynomial<F, N> { fn to_native_fields(&self) -> Vec<BigInt> { self.coefficients.map(|x| x.val).into_iter().collect() } }
#
impl<F: FieldSpec, const N: usize> MulVar for Polynomial<F, N> {
    fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        let mut output_coeffs = vec![];

        with_zkp_ctx(|ctx| {
            // We'll start with the zero polynomial, and add to each coefficient
            // as we go
            output_coeffs = vec![ctx.add_constant(&BigInt::ZERO); N];

            // When multiplying (a_i x^i) * (b_j x^j), we get a (a_i * b_j) addend
            // for the `x^{i+j}` coefficient
            for i in 0..N {
                for j in 0..N {
                    // But! Recall we reduce any x^{i+j} to x^{(i+j) % N}
                    // in the quotient ring
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
```

## Implementing evaluation

We want to define the evaluate function not on the `Polynomial` itself, but
rather the `ProgramNode`&mdash;this way we can evaluate polynomial variables within
ZKP programs.

```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeName for Polynomial<F, N> { fn type_name() -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..Field::<F>::type_name() } } }
# impl<F: FieldSpec, const N: usize> NumFieldElements for Polynomial<F, N> { const NUM_NATIVE_FIELD_ELEMENTS: usize = N; }
# impl<F: FieldSpec, const N: usize> ToNativeFields for Polynomial<F, N> { fn to_native_fields(&self) -> Vec<BigInt> { self.coefficients.map(|x| x.val).into_iter().collect() } }
#
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
```

## Implementing helpers

Next, we'll add a few convenient methods for constructing polynomials within ZKP programs:

```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeName for Polynomial<F, N> { fn type_name() -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..Field::<F>::type_name() } } }
# impl<F: FieldSpec, const N: usize> NumFieldElements for Polynomial<F, N> { const NUM_NATIVE_FIELD_ELEMENTS: usize = N; }
# impl<F: FieldSpec, const N: usize> ToNativeFields for Polynomial<F, N> { fn to_native_fields(&self) -> Vec<BigInt> { self.coefficients.map(|x| x.val).into_iter().collect() } }
# impl<F: FieldSpec, const N: usize> SubVar for Polynomial<F, N> { fn sub(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> { let mut coeff_node_indices = vec![]; with_zkp_ctx(|ctx| { for (left, right) in lhs.ids.iter().zip(rhs.ids) { coeff_node_indices.push(ctx.add_subtraction(*left, *right)); } }); Self::coerce(&coeff_node_indices) } }
# 
impl<F: FieldSpec, const N: usize> Polynomial<F, N> {
    /// Create the zero polynomial.
    pub fn zero() -> ProgramNode<Self> {
        let zero = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ZERO));
        ProgramNode::new(&[zero; N])
    }

    /// Create the polynomial `1`, i.e. the polynomial with zero coefficients
    /// everywhere except for the coefficient `1` at `x^0`.
    pub fn one() -> ProgramNode<Self> {
        let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap();
        let one = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ONE));
        poly_ids[0] = one;
        ProgramNode::new(&poly_ids)
    }

    /// Create the polynomial `x`, i.e. the polynomial with zero coefficients
    /// everywhere except for the coefficient `1` at `x^1`.
    pub fn x() -> ProgramNode<Self> {
        let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap();
        let one = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ONE));
        poly_ids[1] = one;
        ProgramNode::new(&poly_ids)
    }

    /// Make a scalar polynomial, i.e. the polynomial with zero coefficients
    /// everywhere except for the coefficient `scalar` at `x^0`.
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
```

One last thing that will be nice for users is an easy way to construct `Polynomial` inputs
to ZKP programs:

```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
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
```

## In action!

Finally, let's actually use our polynomial type. Since we wrote all that code,
let's use it in two different ZKP programs. 

```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeName for Polynomial<F, N> { fn type_name() -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..Field::<F>::type_name() } } }
# impl<F: FieldSpec, const N: usize> NumFieldElements for Polynomial<F, N> { const NUM_NATIVE_FIELD_ELEMENTS: usize = N; }
# impl<F: FieldSpec, const N: usize> ToNativeFields for Polynomial<F, N> { fn to_native_fields(&self) -> Vec<BigInt> { self.coefficients.map(|x| x.val).into_iter().collect() } }
# impl<F: FieldSpec, const N: usize> MulVar for Polynomial<F, N> { fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> { let mut output_coeffs = vec![]; with_zkp_ctx(|ctx| { output_coeffs = vec![ctx.add_constant(&BigInt::ZERO); N]; for i in 0..N { for j in 0..N { let coeff_index = (i + j) % N; let coeffs_mul = ctx.add_multiplication(lhs.ids[i], rhs.ids[j]); let coeff_addend = if i + j >= N { ctx.add_negate(coeffs_mul) } else { coeffs_mul }; output_coeffs[coeff_index] = ctx.add_addition(output_coeffs[coeff_index], coeff_addend); } } }); Self::coerce(&output_coeffs) } }
# impl<F: FieldSpec, const N: usize> Polynomial<F, N> { pub fn zero() -> ProgramNode<Self> { let zero = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ZERO)); ProgramNode::new(&[zero; N]) } pub fn one() -> ProgramNode<Self> { let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap(); let one = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ONE)); poly_ids[0] = one; ProgramNode::new(&poly_ids) } pub fn x() -> ProgramNode<Self> { let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap(); let one = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ONE)); poly_ids[1] = one; ProgramNode::new(&poly_ids) } pub fn scalar<S>(scalar: S) -> ProgramNode<Self> where S: Into<ProgramNode<Field<F>>>, { let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap(); poly_ids[0] = scalar.into().ids[0]; ProgramNode::new(&poly_ids) } pub fn root<S>(root: S) -> ProgramNode<Self> where S: Into<ProgramNode<Field<F>>>, { let x = Self::x(); let r = Self::scalar(root); x - r } }
# impl<F: FieldSpec, const N: usize> SubVar for Polynomial<F, N> { fn sub(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> { let mut coeff_node_indices = vec![]; with_zkp_ctx(|ctx| { for (left, right) in lhs.ids.iter().zip(rhs.ids) { coeff_node_indices.push(ctx.add_subtraction(*left, *right)); } }); Self::coerce(&coeff_node_indices) } }
# pub trait Evaluate<F: FieldSpec> { fn evaluate<S>(&self, point: S) -> ProgramNode<Field<F>> where S: Into<ProgramNode<Field<F>>>; }
# impl<F: FieldSpec, const N: usize> Evaluate<F> for ProgramNode<Polynomial<F, N>> { fn evaluate<S>(&self, point: S) -> ProgramNode<Field<F>> where S: Into<ProgramNode<Field<F>>>, { let point = point.into().ids[0]; let node_index = with_zkp_ctx(|ctx| { let mut result = ctx.add_constant(&BigInt::ZERO); let mut pow = ctx.add_constant(&BigInt::ONE); for coeff in self.ids { let addend = ctx.add_multiplication(pow, *coeff); result = ctx.add_addition(result, addend); pow = ctx.add_multiplication(pow, point); } result }); ProgramNode::new(&[node_index]) } }
#
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
```

We can also use polynomials as arguments!

```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeName for Polynomial<F, N> { fn type_name() -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..Field::<F>::type_name() } } }
# impl<F: FieldSpec, const N: usize> NumFieldElements for Polynomial<F, N> { const NUM_NATIVE_FIELD_ELEMENTS: usize = N; }
# impl<F: FieldSpec, const N: usize> ToNativeFields for Polynomial<F, N> { fn to_native_fields(&self) -> Vec<BigInt> { self.coefficients.map(|x| x.val).into_iter().collect() } }
# impl<F: FieldSpec, const N: usize> MulVar for Polynomial<F, N> { fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> { let mut output_coeffs = vec![]; with_zkp_ctx(|ctx| { output_coeffs = vec![ctx.add_constant(&BigInt::ZERO); N]; for i in 0..N { for j in 0..N { let coeff_index = (i + j) % N; let coeffs_mul = ctx.add_multiplication(lhs.ids[i], rhs.ids[j]); let coeff_addend = if i + j >= N { ctx.add_negate(coeffs_mul) } else { coeffs_mul }; output_coeffs[coeff_index] = ctx.add_addition(output_coeffs[coeff_index], coeff_addend); } } }); Self::coerce(&output_coeffs) } }
# impl<F: FieldSpec, const N: usize> Polynomial<F, N> { pub fn zero() -> ProgramNode<Self> { let zero = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ZERO)); ProgramNode::new(&[zero; N]) } pub fn one() -> ProgramNode<Self> { let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap(); let one = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ONE)); poly_ids[0] = one; ProgramNode::new(&poly_ids) } pub fn x() -> ProgramNode<Self> { let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap(); let one = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ONE)); poly_ids[1] = one; ProgramNode::new(&poly_ids) } pub fn scalar<S>(scalar: S) -> ProgramNode<Self> where S: Into<ProgramNode<Field<F>>>, { let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap(); poly_ids[0] = scalar.into().ids[0]; ProgramNode::new(&poly_ids) } pub fn root<S>(root: S) -> ProgramNode<Self> where S: Into<ProgramNode<Field<F>>>, { let x = Self::x(); let r = Self::scalar(root); x - r } }
# impl<F: FieldSpec, const N: usize> SubVar for Polynomial<F, N> { fn sub(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> { let mut coeff_node_indices = vec![]; with_zkp_ctx(|ctx| { for (left, right) in lhs.ids.iter().zip(rhs.ids) { coeff_node_indices.push(ctx.add_subtraction(*left, *right)); } }); Self::coerce(&coeff_node_indices) } }
# pub trait Evaluate<F: FieldSpec> { fn evaluate<S>(&self, point: S) -> ProgramNode<Field<F>> where S: Into<ProgramNode<Field<F>>>; }
# impl<F: FieldSpec, const N: usize> Evaluate<F> for ProgramNode<Polynomial<F, N>> { fn evaluate<S>(&self, point: S) -> ProgramNode<Field<F>> where S: Into<ProgramNode<Field<F>>>, { let point = point.into().ids[0]; let node_index = with_zkp_ctx(|ctx| { let mut result = ctx.add_constant(&BigInt::ZERO); let mut pow = ctx.add_constant(&BigInt::ONE); for coeff in self.ids { let addend = ctx.add_multiplication(pow, *coeff); result = ctx.add_addition(result, addend); pow = ctx.add_multiplication(pow, point); } result }); ProgramNode::new(&[node_index]) } }
#[zkp_program]
pub fn private_eval<F: FieldSpec>(
    eval: Field<F>,
    point: Field<F>,
    #[public] poly: Polynomial<F, 10>,
) {
    poly.evaluate(point).constrain_eq(eval);
}
```

For completeness, here's an example of proving and verifying these ZKPs:
```rust
# use sunscreen::{ bulletproofs::BulletproofsBackend, types::zkp::{ AddVar, BigInt, BulletproofsField, Coerce, MulVar, Field, FieldSpec, NumFieldElements, ProgramNode, SubVar, ToNativeFields, }, zkp::{with_zkp_ctx, ZkpContextOps}, zkp_program, zkp_var, Compiler, Error, TypeName, ZkpBackend, ZkpRuntime, };
# #[derive(Debug, Copy, Clone)] pub struct Polynomial<F: FieldSpec, const N: usize> { coefficients: [Field<F>; N], }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeName for Polynomial<F, N> { fn type_name() -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..<Field::<F> as sunscreen::types::TypeName>::type_name() } } }
# impl<F: FieldSpec, const N: usize> sunscreen::types::TypeNameInstance for Polynomial<F, N> { fn type_name_instance(&self) -> sunscreen::types::Type { sunscreen::types::Type { name: String::from("Polynomial"), ..<Field::<F> as sunscreen::types::TypeName>::type_name() } } }
# impl<F: FieldSpec, const N: usize> NumFieldElements for Polynomial<F, N> { const NUM_NATIVE_FIELD_ELEMENTS: usize = N; }
# impl<F: FieldSpec, const N: usize> ToNativeFields for Polynomial<F, N> { fn to_native_fields(&self) -> Vec<BigInt> { self.coefficients.map(|x| x.val).into_iter().collect() } }
# impl<F: FieldSpec, const N: usize> MulVar for Polynomial<F, N> { fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> { let mut output_coeffs = vec![]; with_zkp_ctx(|ctx| { output_coeffs = vec![ctx.add_constant(&BigInt::ZERO); N]; for i in 0..N { for j in 0..N { let coeff_index = (i + j) % N; let coeffs_mul = ctx.add_multiplication(lhs.ids[i], rhs.ids[j]); let coeff_addend = if i + j >= N { ctx.add_negate(coeffs_mul) } else { coeffs_mul }; output_coeffs[coeff_index] = ctx.add_addition(output_coeffs[coeff_index], coeff_addend); } } }); Self::coerce(&output_coeffs) } }
# impl<F: FieldSpec, const N: usize> Polynomial<F, N> { pub fn zero() -> ProgramNode<Self> { let zero = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ZERO)); ProgramNode::new(&[zero; N]) } pub fn one() -> ProgramNode<Self> { let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap(); let one = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ONE)); poly_ids[0] = one; ProgramNode::new(&poly_ids) } pub fn x() -> ProgramNode<Self> { let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap(); let one = with_zkp_ctx(|ctx| ctx.add_constant(&BigInt::ONE)); poly_ids[1] = one; ProgramNode::new(&poly_ids) } pub fn scalar<S>(scalar: S) -> ProgramNode<Self> where S: Into<ProgramNode<Field<F>>>, { let mut poly_ids: [_; N] = Self::zero().ids.try_into().unwrap(); poly_ids[0] = scalar.into().ids[0]; ProgramNode::new(&poly_ids) } pub fn root<S>(root: S) -> ProgramNode<Self> where S: Into<ProgramNode<Field<F>>>, { let x = Self::x(); let r = Self::scalar(root); x - r } }
# impl<F: FieldSpec, const N: usize> SubVar for Polynomial<F, N> { fn sub(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> { let mut coeff_node_indices = vec![]; with_zkp_ctx(|ctx| { for (left, right) in lhs.ids.iter().zip(rhs.ids) { coeff_node_indices.push(ctx.add_subtraction(*left, *right)); } }); Self::coerce(&coeff_node_indices) } }
# pub trait Evaluate<F: FieldSpec> { fn evaluate<S>(&self, point: S) -> ProgramNode<Field<F>> where S: Into<ProgramNode<Field<F>>>; }
# impl<F: FieldSpec, const N: usize> Evaluate<F> for ProgramNode<Polynomial<F, N>> { fn evaluate<S>(&self, point: S) -> ProgramNode<Field<F>> where S: Into<ProgramNode<Field<F>>>, { let point = point.into().ids[0]; let node_index = with_zkp_ctx(|ctx| { let mut result = ctx.add_constant(&BigInt::ZERO); let mut pow = ctx.add_constant(&BigInt::ONE); for coeff in self.ids { let addend = ctx.add_multiplication(pow, *coeff); result = ctx.add_addition(result, addend); pow = ctx.add_multiplication(pow, point); } result }); ProgramNode::new(&[node_index]) } }
# pub fn from_coefficients<B: ZkpBackend, const N: usize, I>( coeffs: [I; N],) -> Polynomial<B::Field, N> where Field<B::Field>: From<I>, { Polynomial { coefficients: coeffs.map(Field::from), } }
# #[zkp_program] pub fn one_of<F: FieldSpec>(x: Field<F>, #[public] list: [Field<F>; 5]) { let mut poly = Polynomial::<F, 6>::one(); for elem in list { poly = poly * Polynomial::root(elem); } poly.evaluate(x).constrain_eq(zkp_var!(0)); }
# #[zkp_program] pub fn private_eval<F: FieldSpec>( eval: Field<F>, point: Field<F>, #[public] poly: Polynomial<F, 10>,) { poly.evaluate(point).constrain_eq(eval); }
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
    let list: [_; 5] = std::array::from_fn(|i| BulletproofsField::from(12343 + i as u32));

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

    let poly = from_coefficients::<BulletproofsBackend, 10, _>(
        [1, 42, 0, 0, 0, 3, 0, 0, 0, 0]
    );
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
```

## Final note

Expressing the `one_of` constraint in terms of these polynomials is incredibly
inefficient; you can see this if you change the program to use more than a
5-degree list. If you already know the point `c`, it is much more efficient to compute
`(c - a_1) * ... * (c - a_k)` directly, as this is only `k * (k - 1)` arithmetic
operations. Whereas, using the polynomial approach above, the polynomial
multiplication will happen first, which requires _a ton_ of multiplication and
addition of coefficients.

[zkp-type]: https://docs.rs/sunscreen/latest/sunscreen/types/zkp/trait.ZkpType.html

[^mod-q]: In FHE, we actually use \\(\mathbb{Z}_q[x]/(x^N+1)\\), but we're only
    using \\(\mathbb{Z}[x]/(x^N+1)\\) here for pedagogical reasons.

[^rns]: If you'd like to see a slightly more complicated example as it pertains
    to FHE (specifically the BFV scheme used in our FHE compiler), check out
    [this
    example](https://github.com/Sunscreen-tech/Sunscreen/blob/f05ce704b1a9e220a3d8daab506cf564655e809b/sunscreen/src/types/zkp/rns_polynomial.rs#L28).
    We had originally created this type to evaluate ZKP performance for proving
    BFV ciphertexts are well-formed.

[^forein-trait]: You might wonder why we don't just implement the standard
    library arithmetic traits. This is because the arithmetic operations happen
    on `ProgramNode`s, and these are defined in the `sunscreen` crate. Due to Rust's
    foreign trait restrictions, users are not able to implement the standard
    library arithmetic trait for `ProgramNode<T>`, even if `T` is defined
    locally. The traits above, however, are defined such that the user provides
    implementations for `T`, not `ProgramNode<T>`, which gets around this restriction.

[^mult-const]: In fact, polynomial multiplication was the motivation example for
    [constant inputs](../advanced/constant_inputs.md); it drops the number of
    constraints from \\(N^2\\) to \\(N\\).
