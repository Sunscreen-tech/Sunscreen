# Runtime

To be frank, proving and verifying ZKP programs with linked inputs is much more complicated than [programs without linked inputs](/zkp/runtime/runtime.md). However, we've done our best to offer a high-level API so that most of the complexity is hidden from the user. This API centers around a "builder" of sorts, that allows you to perform encryptions while building up the prover knowledge. We'll walk through how to use it in the next section.

Before we get started with proving and verifying, we'll need to instantiate a
runtime. As we noted in the section on
[compiling](/linked/compiling/compiling.md), linking FHE inputs to ZKP programs
requires some FHE context. Thus, instead of using a `ZkpRuntime`, we'll use an
`FheZkpRuntime`:

```rust
{{#rustdoc_include ../basic_prog.rs:none}}
# fn main() -> Result<(), Error> {
let app = Compiler::new()
    .fhe_program(increase_by_factor)
    .zkp_backend::<BulletproofsBackend>()
    .zkp_program(is_greater_than_one)
    .compile()?;

let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
#     Ok(())
# }
```

Once you're created a runtime, you can:
* [make a proof](./prove.md)
* [verify a proof](./verify.md)
