# Unified Parameters

In many real life scenarios, we want to run different programs on an encrypted data set.

Let's imagine we have a private version of 23andMe run by Service Provider. Service Provider (SP) sets up the protocol and thus is responsible for choosing the appropriate FHE scheme parameters with which the user will generate keys and then encrypt her data. SP chooses parameter set &alpha; based on wanting to run `test_a` on the user's data. They'd like to run the more complex `test_b` as well on the user's data. However, it turns out that parameter set &alpha; is not adequate for running `test_b`. One solution would be for the SP to figure out the appropriate parameter set for `test_b`&mdash;let's say this is parameter set &beta;&mdash;and then ask the user to generate new keys and encrypt her data with respect to this new parameter set. A pretty bad solution right?

In this section, we'll see how to encrypt data in such a way that we can run multiple FHE programs on it; supporting this requires choosing scheme parameters that work for a *set* of pre-determined FHE programs. 

Some other scenarios where you might want unified parameters include:
- training on a private data set where you'd like to experiment with various algorithms
- private inference where you may want to make various predictions using the same user-provided data set

## Specifying multiple FHE programs
Let's assume we want to run `function1`, `function2`, and `function3` on an encrypted data set.

```rust, no_run
#[fhe_program(scheme = "bfv")]
fn function1() {
}

#[fhe_program(scheme = "bfv")]
fn function2() {
}

#[fhe_program(scheme = "bfv")]
fn function3() {
}
```

As usual, we declare each of our functions as an FHE program with the appropriate attribute (`#[fhe_program(scheme = "bfv")])`).

 ```rust, no_run
fn main() -> Result<(), Error> {
    let app = Compiler::new()
        .fhe_program(function1)
        .fhe_program(function2)
        .fhe_program(function3)
        .compile()?;

    Ok(())
}
```

When we invoke the compiler to build our programs, we pass in each of the programs individually. Behind the scenes, our compiler then chooses FHE scheme parameters that work for running any of the programs!
