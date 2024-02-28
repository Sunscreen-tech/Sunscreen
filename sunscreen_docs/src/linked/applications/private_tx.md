# Private transactions

In this implementation, we'll achieve **privacy** with FHE. Any private values
(balances, transaction amounts) will be encrypted as ciphertexts, and
transparent computation will rely on homomorphic FHE programs.[^1] We'll
**prove** the correctness and validity of these private values with linked ZKPs. 

Let's get to it!

## Program walkthrough

The complete example lives [on GitHub](https://github.com/Sunscreen-tech/Sunscreen/blob/main/examples/private_tx_linkedproof/src/main.rs) if you want to see it altogether.

### Setup

First, let's import everything we need:

```rust,ignore
{{#include private_tx.rs:imports}}
```

### FHE programs

The FHE programs are mostly trivial. We definitely need addition and subtraction
to update user's balances, and these are performed on encrypted values. In
addition, in our implementation, we'll assume that users are going to
deposit into their private accounts from a public account (perhaps the native
currency of a blockchain, like `ETH`), so we'll make use of the fact that we can
perform addition on mixed ciphertext and plaintext values.

```rust,ignore
{{#include private_tx.rs:fhe_programs}}
```

### ZKP programs

#### Transfer

Let's first consider what constitutes a valid transfer. Since we need to add the
transaction amount to both the sender and the receiver's balance, we actually
need _two_ ciphertexts, one encrypted under the sender's key and the other under the
receiver's key. We'll need to prove that

1. the sender has enough funds to send the tx amount
2. the tx amount is positive
3. the ciphertexts encrypt the same amount
4. the ciphertexts are fresh encryptions

The first three are rather obvious requirements for the correctness of the payment
system, but the last one is more subtle. We need to ensure these are fresh
encryptions because BFV doesn't have unbounded computation depth. We wouldn't
want a bad actor to be able to send an encrypted transaction with a ton of
[noise](/fhe/advanced/noise_margin.md) that causes the receiver's balance to be
un-decryptable. 

As we'll see [below](#transfer-3), the last two properties are handled outside of the ZKP
program (by the [SDLP](/linked/intro/how.md)), so let's validate the first two
properties.

```rust,ignore
{{#include private_tx.rs:validate_transfer}}
```

#### Registration

As we noted above, we're assuming a deposit to a private account occurs from a
public account. But the user's balance must be encrypted, so how can we
_initialize_ it? We can't easily encrypt the initial deposit, at least in a
consensus-driven setting, as encryptions are randomized. Instead, we'll have the
user send over their encrypted initial balance with a ZKP proving that the encrypted
amount is equal to the public deposit. 

```rust,ignore
{{#include private_tx.rs:validate_registration}}
```

#### Refresh balance

To really make this example realistic, we're including a balance refresh
operation. We refresh a balance so that

1. the ciphertext doesn't overflow its [noise budget](/fhe/advanced/noise_margin.md)
2. the encrypted plaintext doesn't overflow its [plaintext modulus](/fhe/advanced/plain_modulus/plain_modulus.md)

We need to prove that the fresh balance does indeed have a fresh encoding, and
that it encrypts the same value as the existing one.[^2]

```rust,ignore
{{#include private_tx.rs:validate_refresh_balance}}
```

### App

For convenience, we'll wrap up the FHE and ZKP programs into an application
type, this way each party can instantiate the same programs and run operations
with the same paramaters.

```rust,ignore
{{#include private_tx.rs:app_1}}
{{#include private_tx.rs:app_2}}
```

### Transactions

Since we're imagining a blockchain like setting, users will act by sending
atomic transactions to the chain. Let's piece together what the transaction
types will look like.

#### Transfer

Recall a user needs to send over two ciphertexts encrypting the transaction amount.
Of course, they'll also need to send the validity proof and a way to identify the
sender and receiver.

```rust,ignore
{{#include private_tx.rs:username_type}}

{{#include private_tx.rs:transfer_type}}
```

#### Deposit

A registration will rely on a deposit, so let's define this type first. Since
the amount is public, depositing into an existing account doesn't have any proof
requirements.

```rust,ignore
{{#include private_tx.rs:deposit_type}}
```

#### Registration

As mentioned, the registration is an initial deposit _with_ a matching initial
encrypted balance. In addition, the computing party needs to know the user's
public key to run FHE programs on their ciphertexts.

```rust,ignore
{{#include private_tx.rs:register_type}}
```

#### Refresh balance

Lastly, refreshing a balance requires the new ciphertext and its accompanying
proof of validity.

```rust,ignore
{{#include private_tx.rs:refresh_type}}
```

### Chain

Next up let's define a "chain" type to mimic a hypothetical blockchain perspective.

```rust,ignore
{{#include private_tx.rs:transaction_type}}

{{#include private_tx.rs:chain_type}}

impl Chain {
{{#include private_tx.rs:chain_new}}
}
```

#### Registration

Here's how the chain will verify a registration and, if successful, update its state.

```rust,ignore
impl Chain {
{{#include private_tx.rs:chain_register}}
}
```

#### Deposit

Once a user is registered, they can make more deposits. The chain will use the
`deposit_to` FHE program, adding the public plaintext amount to the encrypted
balance.

```rust,ignore
impl Chain {
{{#include private_tx.rs:chain_deposit}}
}
```

#### Transfer

For a private transfer, the chain needs to verify the inputs by verifying the
accompanying proof, and then run two FHE programs, one for the sender and one
for the receiver. 

```rust,ignore
impl Chain {
{{#include private_tx.rs:chain_transfer}}
}
```

#### Refresh balance

Finally, to refresh a balance the chain simply needs to verify the proof and
then overwrite the existing balance.

```rust,ignore
impl Chain {
{{#include private_tx.rs:chain_refresh}}
}
```

### User

Now let's go over the user's perspective and how they'll construct these kinds
of transactions. First we'll define a user type

```rust,ignore
{{#include private_tx.rs:user_type}}

impl User {
{{#include private_tx.rs:user_new}}
}
```

#### Registration

To register, a user will use the `LinkedProofBuilder` to encrypt their initial
deposit and link it to the ZKP proving its equality to the public amount. We'll
also add some print statements in so that we can watch what happens when we run
`main` below.

```rust,ignore
impl User {
{{#include private_tx.rs:user_deposit}}

{{#include private_tx.rs:user_register}}
}
```

#### Transfer

To create a transfer, the user needs to encrypt the transaction under the
receiver's public key; they can read this off the chain, since registered users
will have their public keys stored there. They also will need to read off their
current encrypted balance to link it to the `validate_transfer` proof.

Here, we'll make use of some of the more exotic methods of the `LinkedProofBuilder`;
after calling `encrypt_returning_link` to link the transaction amount to the
ZKP, we'll call `reencrypt` which implicitly proves that the returned
ciphertexts encrypt the same plaintext message. Both of these methods also
implicitly prove that the returned ciphertexts are fresh encryptions. Finally
we'll call `decrypt_returning_link` to link the current balance to the ZKP.

```rust,ignore
impl User {
{{#include private_tx.rs:user_transfer}}
}
```

#### Refresh balance

Refreshing a balance requires linking both the fresh encryption and the existing
ciphertext. We'll again read the existing ciphertext off the chain.

```rust,ignore
impl User {
{{#include private_tx.rs:user_refresh}}
}
```

Astute readers may have noticed that we've proven ciphertext equality within the
ZKP program, rather than calling `builder.reencrypt(existing_link)` as we did
for the transfer linked proof. By calling `encrypt_returning_link` we are
creating a new _freshly encoded_ plaintext, and then creating a _freshly
encrypted_ ciphertext of it. The `reencrypt` method does _not_ create a freshly
encoded plaintext, rather it re-encrypts the exact plaintext of the existing
message. (And since our ZKP program constrains the linked value to a fresh
encoding, this would fail for anything but initial balances.)

### Run it!

Finally, here's a runnable `main` function demonstrating the transactions above:

```rust
{{#rustdoc_include private_tx.rs:main}}
```

[^1]: It's worth noting that we are also implicitly relying on the fact that FHE programs are _deterministic_. You could imagine a scenario where one tries to accomplish this by having a trusted party decrypt the inputs, perform the computation, and then encrypt the result - but that encryption of the result relies on randomness, which is generally not available for a consensus-driven compute setting like a blockchain. Because FHE programs are deterministic, any validators running the computation will always get the exact same ciphertext result, allowing consensus to proceed.

[^2]: In practice, you may wish to restrict the ciphertexts of transaction or deposit amounts to also be fresh encodings. With some additional metadata on chain indicating how many modifications have been performed on a user's balance, you could effectively track how close the coefficients are to the [plaintext modulus](/linked/advanced/plain_modulus.md), and then restrict a user from making transactions unless they refresh their balance.
