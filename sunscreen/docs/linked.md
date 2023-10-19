# Linked SDLP and R1CS proofs

This function creates a linked proof between a short discrete log proof (SDLP) and a R1CS bulletproof. An example use case is proving an encryption is valid (by SDLP) and that the encrypted message has some property (by R1CS Bulletproof).

The SDLP is used to prove a linear relation while keeping part of that relation secret. Specifically, the SDLP allows one to prove a matrix relation of the form \\(A * S = T\\), where \\(S\\) is a matrix of secrets (sometimes also called a witness) and \\(T\\) is the result of computing \\(A\\) on that secret.  An example relation is the equation for encryption in BFV, which can be used to show that a ciphertext is a valid encryption of some underlying message instead of a random value.

R1CS bulletproofs enable proving arbitrary arithmetic circuits, which can be used to prove that some secret satisfies some property. For example, one can prove that a private transaction can occur because the sender has enough funds to cover the transaction, without revealing what the transaction is.

Combining these two proofs is powerful because it allows one to prove both that a ciphertext is a valid encryption of some message and that the message satisfies some property. In the prior example of a private transaction, with a linked proof we can now prove that the sender knows the value in an encrypted transaction and that the sender has enough funds to cover the transaction, without decrypting the transaction.

How does this work in practice? We will first generate a lattice problem of the form \\(A * S = T\\) and then specify what parts of S are shared with the ZKP program. We then specify the remaining private inputs to the ZKP program, the public inputs to the ZKP, and the constant inputs to the ZKP.


# Example

Let's perform a transaction where the transaction amount is private and the balance is public. We want to prove that the transaction is valid (i.e. the transaction amount is less than or equal to the balance) without revealing the transaction amount.

Let's first tackle the SDLP to show that we can generate a valid encryption of a message. The BFV encryption equation in SEAL is

\\[
    (c_0, c_1) = (\Delta m + r + p_0 u + e_1,\ p_1 u + e_2)
\\]

where

* \\(\Delta\\) is a constant polynomial with \\(\lfloor q/t \rfloor\\) as it's DC component. \\(q\\) is the coefficient modulus and t is the plain modulus,
* \\(m\\) is the polynomial plaintext message to encrypt,
* \\(r\\) is a rounding polynomial proportional to m with coefficients in the range \\([0, t]\\),
* \\(p_0\\) and \\(p_1\\) are the public key polynomials,
* \\(u\\) is a random ternary polynomial,
* \\(e_1\\) and \\(e_2\\) are random polynomials sampled from the centered binomial distribution, and
* \\(c_0\\) and \\(c_1\\) are the ciphertext polynomials.

This can be implemented as a linear relation as follows.

\\[
    \begin{aligned}
        \begin{bmatrix}
        \Delta & 1 & p_0 & 1 & 0 \\\\
        0 & 0 & p_1 & 0 & 1 \\\\
        \end{bmatrix}
        \begin{bmatrix}
        m \\\\ r \\\\ u \\\\ e_1 \\\\ e_2
        \end{bmatrix}
        =
        \begin{bmatrix}
        c_0 \\\\ c_1
        \end{bmatrix}
    \end{aligned}
\\]

To perform the SDLP, we will need to specify the bounds for each coefficient of each element of S. In the case where we encode m as a constant polynomial (ie the plaintext is a constant in the DC coefficient and zero for all other coefficients), the bounds for \\(m\\) are `[t, 0, ..., 0]`, while the bounds for the other components are based on their respective distributions.

Here is an example for generative the BFV encryption linear relation of an unsigned number using the `logproof::test::seal_bfv_encryption_linear_relation` function.

```rust
# use logproof::rings::SealQ128_1024;
# use logproof::test::seal_bfv_encryption_linear_relation;
let transaction = 10_000u64;

// Generate a lattice problem for A * S = T (mod f). The bounds for each
// coefficient of each element of S are calculated in the function.
let lattice_problem = seal_bfv_encryption_linear_relation::<SealQ128_1024, 1>(
    transaction, 
    1024,  // Lattice dimension
    12289, // Plaintext modulus
    false  // Use the single encoder instead of the batch encoder
);
```

The second proof we would like to show is that the encrypted value is less than some balance. We can do that using the Sunscreen compiler and the following ZKP.

```rust
#[zkp_program]
fn valid_transaction<F: FieldSpec>(#[private] x: [Field<F>; 15], #[public] balance: Field<F>) {
    let lower_bound = zkp_var!(0);

    // Reconstruct x from the bag of bits
    let x_recon = from_twos_complement_field_element(x);

    // Constraint that x is less than or equal to balance
    balance.constrain_ge_bounded(x_recon, 64);

    // Constraint that x is greater than or equal to zero
    lower_bound.constrain_le_bounded(x_recon, 64);
}
```

Interestingly the transaction amount is not specified as a number but in its twos complement binary representation. This is because in the SDLP, the message polynomial is expanded into its twos complement binary and then used as an input to the proof. In order to link the SDLP and the ZKP program, we will be sharing this binary expansion between the two proof systems. This requires the ZKP to convert the binary expanded message polynomial back into something meaningful. It is important to note that the ZKP has to know the number of bits in the message polynomial expansion at compile time, hence the raw `15` number above.

In this particular example (a constant polynomial message with bounds on the DC component only), we can use this helper function to reconstitute the transaction amount.

```rust
fn from_twos_complement_field_element<F: FieldSpec, const N: usize>(
    x: [ProgramNode<Field<F>>; N],
) -> ProgramNode<Field<F>> {
    let mut x_recon = zkp_var!(0);

    for (i, x_i) in x.iter().enumerate().take(N - 1) {
        x_recon = x_recon + (zkp_var!(2i64.pow(i as u32)) * (*x_i));
    }

    x_recon = x_recon + zkp_var!(-(2i64.pow((N - 1) as u32))) * x[N - 1];

    x_recon
}
```

With all of these pieces, we can use the `LinkedProof::create` function to generate
a proof that the encrypted transaction amount is less than or equal to the
balance.

```rust
let app = Compiler::new()
    .zkp_backend::<BulletproofsBackend>()
    .zkp_program(valid_transaction)
    .compile()?;

// Compile the ZKP program
let valid_transaction_zkp = app.get_zkp_program(valid_transaction).unwrap();

// Private and public inputs
let x = 10_000u64;
let balance = 12_000u64;

// Generate the SDLP linear relation and specify that the message part of S
// should be shared.
let sdlp = seal_bfv_encryption_linear_relation::<SealQ128_1024, 1>(x, 1024, 12289, false);
let shared_indices = vec![(0, 0)];

println!("Performing linked proof");
let lp = LinkedProof::create(
    &sdlp,
    &shared_indices,
    valid_transaction_zkp,
    vec![],
    vec![BulletproofsField::from(balance)],
    vec![],
)
.unwrap();
println!("Linked proof done");
```

This will generate an proof of type `LinkedProof` that can be verified as follows:

```rust
println!("Performing linked verify");
lp.verify(
    valid_transaction_zkp,
    vec![BulletproofsField::from(balance)],
    vec![],
)
.expect("Failed to verify linked proof");
println!("Linked verify done");
```
