# My first FHE program

Now that we have installed the Sunscreen crate as a dependency, let's get started writing our first private app using FHE! Writing our program will be a gradual process and we'll add more code as we progress through this section. 

In this example, we'll just multiply two encrypted integers.

```rust
use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Compiler, Error, Runtime,
};

#[fhe_program(scheme = "bfv")]
fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    a * b
}

fn main() {
}
```

Notice that the `simple_multiply` function is like any other function in Rust, except for the `#[fhe_program(...)]` attribute. This is where the magic happens&mdash; it declares your function as an FHE program that can be compiled. The `scheme` argument should always be `"bfv"`, though we may support additional FHE schemes in the future.

`simple_multiply`'s signature specifies that it takes in two `Cipher<Signed>` values and returns one. `Cipher<T>` indicates the contained type `T` is encrypted (i.e. a ciphertext) and `Signed` is Sunscreen's signed integer type; thus, `Cipher<Signed>` indicates that we have an encrypted signed integer.  The body of `simple_multiply` multiplies the ciphertexts `a` and `b` together. As with any function in Rust, omitting a `;` returns an expression's value from the current scope.

Having specified our program, let's compile it.

```rust
use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Compiler, Error, Runtime,
};

#[fhe_program(scheme = "bfv")]
fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    a * b
}

fn main() -> Result<(), Error> {
    let app = Compiler::new()
        .fhe_program(simple_multiply)
        .compile()?;

    Ok(())
}
```

We invoke the compiler to build our `simple_multiply` FHE program. Compilation translates our program into a runnable format, performs optimizations and fills in implementation details, including figuring out FHE scheme parameters and inserting special operations. 

What's the `?` after at the end of `.compile()`? For the uninitiated, the [`?`](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html) operator propagates errors. Fallible expressions in Rust emit [`Results`](https://doc.rust-lang.org/std/result/enum.Result.html), which can contain either a value or an error. Using `?` unwraps the value in a successful result or immediately returns the error from a failed one, letting the caller of the current function deal with it. We should see the former after compilation, as our program is well-formed.

On success, the compiler emits an `Application` bundle containing the compiled form of each `.fhe_program()` argument. In our case, `app` will contain a single compiled FHE program named `simple_multiply`.

Next, we need a public and private key pair. In order to generate keys, we'll first construct a `Runtime` with the parameters we got from compilation. This allows us to encrypt/decrypt data and run FHE programs.

```rust
use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Compiler, Error, Runtime,
};

#[fhe_program(scheme = "bfv")]
fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    a * b
}

fn main() -> Result<(), Error> {
    let app = Compiler::new()
        .fhe_program(simple_multiply)
        .compile()?;

    let runtime = Runtime::new(app.params())?;

    let (public_key, private_key) = runtime.generate_keys()?;

    let a = runtime.encrypt(Signed::from(15), &public_key)?;
    let b = runtime.encrypt(Signed::from(5), &public_key)?;

    Ok(())
}
```

After constructing our runtime, we generate a public and private key pair by calling `runtime.generate_keys()`.

Next, we call `Signed::from(15)` to make an unencrypted `Signed` integer equal to `15`. Rust doesn't allow implicit type conversion as some languages do, so we use the `From` trait to explicitly convert a Rust `i64` into a Sunscreen `Signed`.

Once we have our plaintext value 15, we encrypt it by calling `runtime.encrypt(...)`, passing in the value and our public key. We repeat this process for `b` with the value `5`. Now that we have the two ciphertexts `a` and `b` to give to `simple_multiply`, we're ready to run our FHE program!

```rust
use sunscreen::{
    fhe_program,
    types::{bfv::Signed, Cipher},
    Compiler, Error, Runtime,
};

#[fhe_program(scheme = "bfv")]
fn simple_multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    a * b
}

fn main() -> Result<(), Error> {
    let app = Compiler::new()
        .fhe_program(simple_multiply)
        .compile()?;

    let runtime = Runtime::new(app.params())?;

    let (public_key, private_key) = runtime.generate_keys()?;

    let a = runtime.encrypt(Signed::from(15), &public_key)?;
    let b = runtime.encrypt(Signed::from(5), &public_key)?;
    
    let results = runtime.run(app.get_program(simple_multiply).unwrap(), vec![a, b], &public_key)?;
    
    let c: Signed = runtime.decrypt(&results[0], &private_key)?;
    assert_eq!(c, 75.into());

    Ok(())
}
```

We call `runtime.run(...)` to execute our FHE program. For the first argument, we pass in our previously compiled program. We retrieve this program by calling `app.get_program()` and unwrapping the result. The second argument is always a [Vec](https://doc.rust-lang.org/std/vec/struct.Vec.html) containing the arguments to the FHE program. In this case, we pass in the encrypted `a` and `b` values. You'll need to pass in the `public_key` as well.

What would happen if we forgot to encrypt one of our values or gave an encrypted `Fractional` value where the program wanted an encrypted `Signed` value? Fortunately, the `run` method first performs some sanity checks to ensure the arguments match the call signature. If the types of the values we pass in don't match the signature, the `run` method returns an error `Result`. The `?` propagates this error, but our program exits because this is the `main()` method!

Next, we call `runtime.decrypt(...)` with the first result and our private key. Programs *can* return more than one value; hence, `results` is a `Vec`. Since our FHE program only returns one value, we decrypt the value at index `0`. The left hand side of the assignment denotes the decrypted data is a `Signed` whereas `runtime.decrypt(...)` ensures this type matches the ciphertext's encrypted value before decryption. If we had assigned a different type to `c`, say `Fractional`, then decrypt would return an error.

Finally, we verify the result equals 75 (i.e. 15 * 5) as expected. 

