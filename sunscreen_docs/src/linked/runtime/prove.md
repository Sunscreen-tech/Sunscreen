# Proving

Now that we know how to construct an `FheZkpRuntime`, we can use it to instantiate a `LinkedProofBuilder`:

```rust
{{#rustdoc_include ../basic_prog.rs:none}}
# fn main() -> Result<(), Error> {
let app = Compiler::new()
    .fhe_program(increase_by_factor)
    .zkp_backend::<BulletproofsBackend>()
    .zkp_program(is_greater_than_one)
    .compile()?;

let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
let (public_key, private_key) = runtime.generate_keys()?;
let mut builder = runtime.linkedproof_builder();
#     Ok(())
# }
```

There are a number of methods on the builder that will help you construct the
proof you need for your particular protocol. We'll walk through some of the more
commonly used methods, but they might not "click" until taking a look at their
usage in the [private transaction example](/linked/applications/private_tx.md).

#### Encrypt

Use the `encrypt` method if you need to encrypt a value and prove that (1) the
ciphertext is freshly encrypted, (2) the ciphertext is well formed, and (3) you
know the underlying encrypted message. However, do _not_ use this method if you
also need to link the input to a ZKP program.

```rust
{{#rustdoc_include ../basic_prog.rs:none}}
# fn main() -> Result<(), Error> {
# let app = Compiler::new()
#     .fhe_program(increase_by_factor)
#     .zkp_backend::<BulletproofsBackend>()
#     .zkp_program(is_greater_than_one)
#     .compile()?;
# 
# let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
# let (public_key, private_key) = runtime.generate_keys()?;
# let mut builder = runtime.linkedproof_builder();
let ct = builder.encrypt(&Signed::from(1), &public_key)?;
#     Ok(())
# }
```

Similarly you can call `encrypt_symmetric` and provide a private key, if you'd
like to use a symmetric encryption.

```rust
{{#rustdoc_include ../basic_prog.rs:none}}
# fn main() -> Result<(), Error> {
# let app = Compiler::new()
#     .fhe_program(increase_by_factor)
#     .zkp_backend::<BulletproofsBackend>()
#     .zkp_program(is_greater_than_one)
#     .compile()?;
# 
# let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
# let (public_key, private_key) = runtime.generate_keys()?;
# let mut builder = runtime.linkedproof_builder();
let ct = builder.encrypt_symmetric(&Signed::from(1), &private_key)?;
#     Ok(())
# }
```

#### Encrypt returning link

The `encrypt_returning_link` method returns back a `LinkedMessage` in addition
to the `Ciphertext` encryption. Use this method if you need to encrypt a value
and prove that it is (1) freshly encrypted, (2) well formed, (3) you know the
underlying encrypted message, and (4) you want to link the message as an input
to a ZKP program.

```rust,no_run
{{#rustdoc_include ../basic_prog.rs:none}}
# fn main() -> Result<(), Error> {
# let app = Compiler::new()
#     .fhe_program(increase_by_factor)
#     .zkp_backend::<BulletproofsBackend>()
#     .zkp_program(is_greater_than_one)
#     .compile()?;
# 
# let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
# let (public_key, private_key) = runtime.generate_keys()?;
# let mut builder = runtime.linkedproof_builder();
let (ct, link) = builder.encrypt_returning_link(&Signed::from(2), &public_key)?;
let proof = builder
    .zkp_program(app.get_zkp_program(is_greater_than_one).unwrap())?
    .linked_input(link)
    .build();
#     Ok(())
# }
```

Again, you can also use `encrypt_symmetric_returning_link` to do the same thing
for a symmetric encryption.

> NS: Can we change it so the linked_input is provided as an input to 'verify' rather than part ofthe builder?

#### Decrypt returning link

Use the `decrypt_returning_link` method if you have an existing ciphertext,
perhaps the result of some FHE program computation, and you want to prove that
(1) the ciphertext is well formed, (2) you know the underlying encrypted
message, and (3) you want to link the message as an input to a ZKP program.

```rust,no_run
{{#rustdoc_include ../basic_prog.rs:none}}
# fn main() -> Result<(), Error> {
# let app = Compiler::new()
#     .fhe_program(increase_by_factor)
#     .zkp_backend::<BulletproofsBackend>()
#     .zkp_program(is_greater_than_one)
#     .compile()?;
# 
# let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
# let (public_key, private_key) = runtime.generate_keys()?;
# let mut builder = runtime.linkedproof_builder();
# let existing_ct = runtime.encrypt(Signed::from(1), &public_key)?;
let (pt, link) = builder.decrypt_returning_link::<Signed>(&existing_ct, &private_key)?;
let proof = builder
    .zkp_program(app.get_zkp_program(is_greater_than_one).unwrap())?
    .linked_input(link)
    .build();
#     Ok(())
# }
```

#### Re-encrypt

Lastly, you can use `reencrypt` to take an existing `LinkedMessage` and encrypt it
_again_. This might seem strange at first, but you may find cases where this is
useful. For example, if you need to encrypt the same value under multiple public
keys and you want to show that those ciphertexts are in fact (1) well formed, (2)
freshly encrypted, and (3) encrypt the same underlying value, then this method
will come in handy. Conveniently, all encryptions of a single link will still be
_one message_ to link to the ZKP, so you don't have to provide all of them as
separate linked inputs.

```rust,no_run
{{#rustdoc_include ../basic_prog.rs:none}}
# fn main() -> Result<(), Error> {
# let app = Compiler::new()
#     .fhe_program(increase_by_factor)
#     .zkp_backend::<BulletproofsBackend>()
#     .zkp_program(is_greater_than_one)
#     .compile()?;
# 
# let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
# let (my_public_key, my_private_key) = runtime.generate_keys()?;
# let (other_public_key, other_private_key) = runtime.generate_keys()?;
# let mut builder: LinkedProofBuilder = todo!();
let (ct_my_key, link) = builder.encrypt_returning_link(&Signed::from(2), &my_public_key)?;
let ct_other_key = builder.reencrypt(&link, &other_public_key)?;
let proof = builder
    .zkp_program(app.get_zkp_program(is_greater_than_one).unwrap())?
    .linked_input(link)
    .build();
#     Ok(())
# }
```

It bears repeating that this method _purposefully reveals that two ciphertexts encrypt the same value_! So, use this method with care and only when appropriate. There's an example of using this method in the [private transaction example](/linked/applications/private_tx.md).
