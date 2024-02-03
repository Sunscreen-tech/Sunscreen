# Troubleshooting

## How do I debug my program?

Debugging ZKP programs is currently quite difficult. We recommend you follow standard best coding practices for now. We will soon offer a debugger that should make this process easier.

## What the heck is a `ProgramNode`?

It's a type wrapper needed to compile your ZKP program. Internally, the
`#[zkp_program]` macro turns all your program inputs and outputs into graph
nodes &mdash; i.e. `ProgramNodes`. Operator inputs and outputs are actually
`ProgramNode`s, which build up the circuit during compilation.
Unfortunately, they tend to be a leaky abstraction that wind up in error
messages.

Usually, these errors tell you a `ProgramNode` doesn't support an operation
you're trying to perform. In the example below, the compiler is saying you can't
compare values:

```text
error[E0369]: binary operation `>` cannot be applied to type `ProgramNode<Field<F>>`
  --> examples/ordering_zkp/src/main.rs:13:15
   |
13 |     let b = x > y;
   |             - ^ - ProgramNode<Field<F>>
   |             |
   |             ProgramNode<Field<F>>
```

This can also crop up when using explicit annotations. For example, the
following will fail to compile:

```rust,no_run,compile_fail
use sunscreen::{zkp_program, zkp_var, types::zkp::{Field, FieldSpec}};
#[zkp_program]
fn either<F: FieldSpec>(
    x: Field<F>,
    y: Field<F>,
) {
    let diff: Field<F> = x - y;     // This type annotation isn't correct!
    diff.constrain_eq(zkp_var!(0));
}
```

Unnecessary type annotations are unidiomatic and thus we advise against them.
Usually, type inference is sufficient, but if you really need one you can import
and use `sunscreen::types::zkp::ProgramNode`.

```rust
use sunscreen::{zkp_program, zkp_var, types::zkp::{Field, FieldSpec, ProgramNode}};
#[zkp_program]
fn either<F: FieldSpec>(
    x: Field<F>,
    y: Field<F>,
) {
    let diff: ProgramNode<Field<F>> = x - y;     // Fixed!
    diff.constrain_eq(zkp_var!(0));
}
```
