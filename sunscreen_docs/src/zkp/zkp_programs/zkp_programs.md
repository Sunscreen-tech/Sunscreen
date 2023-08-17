# What's in a ZKP program?

If you've already read through [our FHE compiler documentation](https://docs.sunscreen.tech/), you'll find that ZKPs
are, in many ways, much simpler. This is perhaps unsurprising; whereas FHE
enables general purpose private computation, ZKPs have a narrower purpose. For
example, ZKP programs don't even have return values!

This section describes the anatomy of a ZKP program, what you can and can't do,
and the different types involved in ZKP programs.


## ZKP program interface requirements

ZKP programs implement their logic in the `fn` function beneath the
`#[zkp_program]` attribute. 

The `fn` function you write has to satisfy the following
conditions:
* Must be stand-alone (i.e. not a `struct` method, closure, `trait` method, etc).
* Must take one generic param `F: FieldSpec`.
* May take any number of arguments, but each type must be [supported](./types.md).
* May *not* have any return values.

## Operations

Some aspects of writing ZKP programs may be surprising to you if you're not familiar with [R1CS constraints](https://learn.0xparc.org/materials/circom/additional-learning-resources/r1cs%20explainer/) at a high level. Not to worry, we'll explain how this plays into the operations available to you.

In ZKP programs, you can:

- Perform basic arithmetic operations (`+`, `-`, `*`)&mdash;specially only those native to R1CS. Integer division (with remainder) and field inversion are not directly possible since these operations are *not* native to R1CS, but can be implemented via a [gadget](../advanced/gadgets.md).
- Add [constraints](./constraints.md) to enforce that certain mathematical statements hold in the proof.
- Call other functions.
- Use any Rust construct (e.g. `match`, `for i in ...`, `if...else`) on data
  *not* derived from any argument. We walk through a number of examples in the
  [limitations](./limitations.md) chapter.
