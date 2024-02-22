# Types

With the `linkedproofs` feature enabled, the [original ZKP
types](/zkp/zkp_programs/types.md) are extended to include types that mirror
their FHE counterparts.

## How to link?

Before we enumerate those types, there are a few traits and attributes to be aware of that determine the ability to link an FHE ciphertext to a ZKP program.

### Linking

The `LinkWithZkp` trait is implemented for FHE types (like [Signed][signed], [Unsigned][unsigned], etc.) that supporting linking the private encrypted values as inputs to a ZKP program. This trait uniquely defines the ZKP counterpart type; for example, the following impl

```rust
# trait FieldSpec {}
# trait LinkWithZkp {
#     type ZkpType<F: FieldSpec>;
# }
impl LinkWithZkp for sunscreen::types::bfv::Signed {
    type ZkpType<F: FieldSpec> = sunscreen::types::zkp::BfvSigned<F>;
}
```

indicates that when you link a `Signed` value, the corresponding type expected in your ZKP program signature is `BfvSigned<F>` (otherwise you will see a type error).

### Decoding

Recall that plaintext values in FHE are actually
[polynomials](/fhe/intro/why.md), and to be cryptographically secure, when you
link an FHE type to a ZKP program, it is actually this plaintext polynomial that is
inserted into the ZKP circuit. 

Of course, if you are linking this value to your ZKP program, you _probably_ don't care about the actual encoding (i.e., the plaintext polynomial coefficients), but rather the _underlying value_ being encoded, whether that's a signed, unsigned, or rational value. This is where the `AsFieldElement` trait comes in: given a `linked_input`, the trait method `linked_input.into_field_elem()` decodes the input into a native field element.

### Specifying linked inputs

Linked inputs are handled specially with the `#[linked]` argument attribute.
Such arguments are also inherently private, but they must be specified with the
linked attribute rather than the `#[private]` attribute. In fact, we enforce
that you can use the argument types below _if and only if_ they are adorned with
the `#[linked]` attribute; doing otherwise will result in a compile-time error.

Lastly, note that `#[linked]` arguments must be specified _before_ all other
argument types (private, public, and constant).

## Signed

The counterpart of the FHE [Signed][signed] type is
`BfvSigned`:

```rust
# use sunscreen::{
#     types::zkp::{AsFieldElement, BfvSigned, ConstrainEq, Field, FieldSpec}, zkp_program
# };
#
#[zkp_program]
fn is_negation<F: FieldSpec>(#[linked] a: BfvSigned<F>, b: Field<F>) {
    a.into_field_elem().constrain_eq(b.neg());
}
```

## Unsigned

The counterpart of the FHE [Unsigned64][unsigned] and [Unsigned128][unsigned] types are
`BfvUnsigned64` and `BfvUnsigned128` respectively:[^1]

```rust
# use sunscreen::{
#     types::zkp::{AsFieldElement, BfvUnsigned64, BfvUnsigned128, ConstrainCmp, Field, FieldSpec}, zkp_program
# };
#
#[zkp_program]
fn exceeds<F: FieldSpec>(#[linked] a: BfvUnsigned64<F>, #[linked] b: BfvUnsigned128<F>) {
    zkp_var!(u32::MAX).constrain_le_bounded(a.into_field_elem(), 64);
    zkp_var!(u64::MAX).constrain_le_bounded(b.into_field_elem(), 128);
}
```

## Rational

The counterpart of the FHE [Rational][rational] type is `BfvRational`. This one
is a bit different from the others because the rational type actually encodes
two signed integers, a numerator and a denominator. Consequently, the
`into_field_elem` actually returns two field elements for this type:

```rust
# use sunscreen::{
#     types::zkp::{AsFieldElement, BfvRational, ConstrainCmp, Field, FieldSpec}, zkp_program
# };
#
#[zkp_program]
fn compare_rational<F: FieldSpec>(#[linked] x: BfvRational<F>, #[linked] y: BfvRational<F>) {
    let (x_num, x_den) = x.into_field_elem();
    let (y_num, y_den) = y.into_field_elem();
    let x = x_num * y_den;
    let y = y_num * x_den;
    x.constrain_le_bounded(y, 128);
}
```

[^1]: Note the absence of ZKP types corresponding to larger unsigned integers like `Unsigned256`. This is because a native field element can only be so large, and while the field modulus will vary depending on the proof system, the current default bulletproofs backend has a field modulus around \\( 2^{252} \\) thus won't fit all 256-bit integers.

[signed]: /fhe/fhe_programs/types/signed.md
[unsigned]: /fhe/fhe_programs/types/unsigned.md
[rational]: /fhe/fhe_programs/types/rational.md
