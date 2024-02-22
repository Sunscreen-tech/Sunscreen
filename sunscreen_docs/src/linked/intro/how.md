# How does this work?

This chapter is not a prerequisite to using our linked compilers, but may be of
interest for anyone curious what's going on under the hood.

# Linked SDLP and R1CS proofs

A linked proof consists of a short discrete log proof (SDLP) and an R1CS bulletproof (BP). It allows you to simultaneously prove an encryption is valid (SDLP) and that the encrypted message has some property (BP). Specifically, the SDLP proves a linear relation while keeping part of that relation secret, while BPs enables proving arbitrary arithmetic circuits, which can be used to prove that a secret satisfies some property. For example, one can prove that a private transaction can occur because the sender has enough funds to cover the transaction, without revealing what the transaction is. This combination of proof systems is powerful because we can now operate on encrypted data using FHE while knowing the person who provided the data encrypted valid information such as a transaction amount.

How does this work in practice? The sunscreen library provides a [builder](`crate::linked::LogProofBuilder`) that allows you can encrypt messages in a very similar way to our typical [`FheRuntime::encrypt`](crate::FheRuntime::encrypt), while also opting to _share_ a message with a linked ZKP program. Under the hood, we'll handle the complicated bits of generating the SDLP and sharing the secrets with the [`zkp_program`](crate::zkp_program).


# Example

Let's perform a transaction where the transaction amount and balance are private. We want to prove that the transaction is valid (i.e. the transaction amount is positive and less than or equal to the balance) without revealing the transaction amount. Let's first define a relevant FHE program for computing the new balance.

```rust
# use sunscreen::{
#     fhe_program,
#     types::{
#         bfv::Signed,
#         Cipher,
#     },
# };
/// Subtract a transaction amount from a user's balance
#[fhe_program(scheme = "bfv")]
fn update_balance(balance: Cipher<Signed>, tx: Cipher<Signed>) -> Cipher<Signed> {
    balance - tx
}
```

We can run this program on encrypted inputs as is, but we likely want to check that the user can perform this action. This means we need to check that the _encrypted_ transaction amount follows these properties:

1. The encrypted amount is well-formed, meaning the user encrypted an intended transaction amount instead of providing a random ciphertext.
2. The transaction amount is less than or equal to the balance. Otherwise a user could spend more than they have.
3. The transaction amount is positive. If not, the user could add money to their balance!

In order to enforce these checks, we can use the following ZKP.

```rust
# use sunscreen::{
#    bulletproofs::BulletproofsBackend,
#    fhe_program,
#    linked::{LinkedProof, LogProofBuilder, Sdlp},
#    types::{
#        bfv::Signed,
#        zkp::{AsFieldElement, BfvSigned, BulletproofsField, ConstrainCmp, Field, FieldSpec},
#        Cipher,
#    },
#    zkp_program, zkp_var, Ciphertext, CompiledFheProgram, CompiledZkpProgram, Compiler,
#    FheZkpApplication, FheZkpRuntime, Params, PrivateKey, PublicKey, Result, ZkpProgramInput,
# };

// Property 1: The encrypted data is well formed. This is proven before this ZKP
// is executed.
#[zkp_program]
fn valid_transaction<F: FieldSpec>(#[linked] tx: BfvSigned<F>, #[public] balance: Field<F>) {
    // Convert the message encoded in the encrypted value into a signed value
    // the ZKP can understand.
    let tx_recon = tx.into_field_elem();

    // Property 2: The user has a high enough balance so they don't spend more
    // than they have.
    balance.constrain_ge_bounded(tx_recon, 64);

    // Property 3: The transaction amount is positive.
    zkp_var!(0).constrain_le_bounded(tx_recon, 64);
}
```

There are two important points to notice in this example. The first is that the encrypted components are provided using the `#[linked]` attribute, where the type specifies how the message in the encrypted data is encoded. Linked arguments must be specified before any other type of argument in a ZKP program.

The second piece to carefully note is that the transaction amount is not immediately available in the ZKP program: the user must call `tx.into_field_element` to convert the message into a value the ZKP can understand. This is because linked inputs are provided _in the underlying encoding format_ of the encryption scheme they are from. In the case of a `BfvSigned` value, this means that the message in the encrypted data is provided as a polynomial where the coefficients of the polynomial form encode something similar to the signed binary expansion of the signed value. The `into_field_element` method converts this representation into a signed ZKP value that can be used with the other normal ZKP methods.

With all of these pieces, we can use the `LinkedProof::create` function to generate
a proof that the encrypted transaction amount is less than or equal to the
balance.

```rust
use sunscreen::{
    bulletproofs::BulletproofsBackend,
    fhe_program,
    linked::{LinkedProof, LogProofBuilder, Sdlp},
    types::{
        bfv::Signed,
        zkp::{AsFieldElement, BfvSigned, BulletproofsField, ConstrainCmp, Field, FieldSpec},
        Cipher,
    },
    zkp_program, zkp_var, Ciphertext, CompiledFheProgram, CompiledZkpProgram, Compiler,
    FheZkpApplication, FheZkpRuntime, Params, PrivateKey, PublicKey, Result, ZkpProgramInput,
    FheProgramInput
};

/// Subtract a transaction amount from a user's balance
#[fhe_program(scheme = "bfv")]
fn update_balance(balance: Signed, tx: Cipher<Signed>) -> Cipher<Signed> {
    balance - tx
}

// Property 1: The encrypted data is well formed. This is proven before this ZKP
// is executed.
#[zkp_program]
fn valid_transaction<F: FieldSpec>(#[linked] tx: BfvSigned<F>, #[public] balance: Field<F>) {
    // Convert the message encoded in the encrypted value into a signed value
    // the ZKP can understand.
    let tx_recon = tx.into_field_elem();

    // Property 2: The user has a high enough balance so they don't spend more
    // than they have.
    balance.constrain_ge_bounded(tx_recon, 64);

    // Property 3: The transaction amount is positive.
    zkp_var!(0).constrain_le_bounded(tx_recon, 64);
}

fn main() {
    // Create an application that contains both our FHE and ZKP programs.
    let app = Compiler::new()
        .fhe_program(update_balance)
        .with_params(&Params {
            lattice_dimension: 1024,
            coeff_modulus: vec![0x7e00001],
            plain_modulus: 512,
            scheme_type: sunscreen::SchemeType::Bfv,
            security_level: sunscreen::SecurityLevel::TC128,
        })
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(valid_transaction)
        .compile()
        .unwrap();

    // Generate the runtime that we can use to encrypt data.
    let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new()).unwrap();

    // Generate the BFV encryption keys.
    let (public_key, _secret_key) = rt.generate_keys().unwrap();

    // Extract the ZKP program.
    let valid_transaction_zkp = app.get_zkp_program(valid_transaction).unwrap();
    let update_balance_fhe = app.get_fhe_program(update_balance).unwrap();

    // The public balance we want to check against.
    let balance = 10i64;

    // The private transaction a user wants to submit.
    let tx = 5;

    let mut proof_builder = LogProofBuilder::new(&rt);

    // Encrypt the transaction amount, returning both the encrypted value and
    // the message to pass to the ZKP.
    let (encrypted_transaction, tx_msg) = proof_builder
        .encrypt_returning_link(&Signed::from(tx), &public_key)
        .unwrap();

    // Generate the proof that the user has a valid transaction to perform. The
    // user would provide this proof, while the external party running the FHE
    // program would verify the ZKP program to ensure the transaction can
    // commense.
    println!("Performing linked proof");
    let lp = proof_builder
        // Prove on the specified ZKP program
        .zkp_program(valid_transaction_zkp)
        .unwrap()
        
        // Provide the inputs to the ZKP. The linked input is provided when we
        // perform the encryption, while the balance is public.
        .linked_input(tx_msg) 
        .public_input(BulletproofsField::from(balance))

        // Build the proof that shows all three properties:
        // 1. That the encrypted linked input is well formed.
        // 2. That the user has the balance to perform the transaction.
        // 3. That the transaction amount is non-negative.
        .build_linkedproof()
        .unwrap();
    println!("Linked proof done");

    // The system running the transaction would perform this validation step to
    // ensure that the transaction is valid.
    println!("Performing linked verify");
    lp.verify(
        valid_transaction_zkp,
        vec![BulletproofsField::from(balance)],
        vec![],
    )
    .expect("Failed to verify linked proof");
    println!("Linked verify done");

    // Now that we have proven the user has submitted a proper transaction, we
    // can execute the transaction. This example is contrived as the same secret
    // and public key are used for a transaction, whereas in practice multiple
    // keys would be involved depending on the system.
    let args: Vec<FheProgramInput> = 
        vec![Signed::from(balance).into(), encrypted_transaction.into()];
    let new_balance = rt.run(
        update_balance_fhe,
        args,
        &public_key,
    ).unwrap();
}
```