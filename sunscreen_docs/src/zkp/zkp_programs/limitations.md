# Limitations

ZKP programs have some limitations you'll need to keep in mind. Some of these restrictions apply more generally to ZKPs while others have to do with the design of our compiler (e.g. our specific choice of arithmetization).


## Comparisons not directly supported

It's important to keep in mind that the values we're working with are native
field elements within R1CS, and _not_ typical integral types.

One of the many differences is that comparisons like `==` or `>` are not
supported on native field elements:

```rust,no_run,compile_fail
#[zkp_program]
fn invalid<F: FieldSpec>(a: Field<F>) {
    // The following lines won't compile!
    let b1 = a == 42;
    let b2 = a > 42;
    let b3 = a <= 42;
}
```

However, you can specify comparisons as *[constraints](./constraints.md)*.

## Division not directly supported

Division (whether it's integer division with remainder or computing the inverse) is not native to R1CS so it must be specified via a "[gadget](../advanced/gadgets.md)".

## Branching restricted to constant expressions

Branches (i.e. `for`, `if/else`, `match`) cannot depend on native field
elements, whether they are from function arguments or created by `zkp_var!`.

For example, you *cannot* do the following:

```rust,no_run,compile_fail
#[zkp_program]
fn invalid<F: FieldSpec>(a: Field<F>, b: Field<F>) {
    let mut c = zkp_var!(0);

    // Can't use native field element b as a loop parameter!
    for i in 0..b {
        c = c + a;
    }

    c.constrain_eq(a * b);
}
```

You *can*, however, use loops and if statements so long as their conditions
don't depend on program inputs. Programs can take things that aren't field elements in so long as they impl ZkpType.

The examples below show **allowed loop
and if statements**:
```rust
# use sunscreen::{
#     types::zkp::{Field, FieldSpec}, zkp_program, zkp_var,
# };
#[zkp_program]
fn loopy<F: FieldSpec>(
    a: Field<F>,
    b: Field<F>,
) {
    let mut c = zkp_var!(0);

    for _i in 0..5 {
        c = c + a;
    }

    c.constrain_eq(b);
}

#[zkp_program]
fn iffy<F: FieldSpec>(
    a: Field<F>,
    b: Field<F>,
) {
    let mut c = zkp_var!(0);

    for i in 1..5 {
        if i % 2 == 0 {
            c = c + zkp_var!(i) * a;
        } else {
            c = c - zkp_var!(i) * a;
        }
    }

    c.constrain_eq(b);
}
```

Notice that their conditions don't depend on any native field elements, so
they're legal.

# Encoding cost

Currently, each time you call `runtime.prove` and `runtime.verify`, we "construct" (i.e. encode) the proof statement for you. Unfortunately, this encoding process often takes a non-trivial amount of time. 

In the future, we'll provide a way to compile the proof statement into a format that can be reused across proofs. 
