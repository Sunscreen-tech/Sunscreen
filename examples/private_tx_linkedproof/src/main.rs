//! In this example, we demonstrate how to use a [`LinkedProof`] to verify a private transaction.
//! We assume the private transactions are implemented on a transparent system like a blockchain,
//! where deterministic computation is performed on encrypted data. The linked proofs allow us to
//! validate the encrypted inputs.

use std::collections::HashMap;

use sunscreen::{
    bulletproofs::BulletproofsBackend,
    fhe_program,
    linked::LinkedProof,
    types::{
        bfv::Signed,
        zkp::{
            AsFieldElement, BfvSigned, BulletproofsField, ConstrainCmp, ConstrainFresh, Field,
            FieldSpec,
        },
        Cipher,
    },
    zkp_program, zkp_var, Ciphertext, CompiledFheProgram, CompiledZkpProgram, Compiler,
    FheProgramInput, FheZkpApplication, FheZkpRuntime, Params, PrivateKey, PublicKey, Result,
};

/// Subtract the transaction amount from the sender's balance.
#[fhe_program(scheme = "bfv")]
fn transfer_from(balance: Cipher<Signed>, tx: Cipher<Signed>) -> Cipher<Signed> {
    balance - tx
}

/// Add the transaction amount to the receiver's balance.
#[fhe_program(scheme = "bfv")]
fn transfer_to(balance: Cipher<Signed>, tx: Cipher<Signed>) -> Cipher<Signed> {
    balance + tx
}

/// Add the public transaction amount to a user's balance.
#[fhe_program(scheme = "bfv")]
fn deposit_to(balance: Cipher<Signed>, deposit: Signed) -> Cipher<Signed> {
    balance + deposit
}

/// Validate a transfer transaction.
#[zkp_program]
fn validate_transfer<F: FieldSpec>(
    #[linked] tx: BfvSigned<F>,
    #[linked] sender_balance: BfvSigned<F>,
) {
    let tx = tx.into_field_elem();
    let sender_balance = sender_balance.into_field_elem();

    // Transaction amount must be greater than 0.
    tx.constrain_gt_bounded(zkp_var!(0), 64);
    // Transaction amount cannot exceed sender's balance.
    tx.constrain_le_bounded(sender_balance, 64);
}

/// Validate registration. The deposit amount is public, but we must prove that the provided
/// ciphertext encrypts the deposit amount.
#[zkp_program]
fn validate_registration<F: FieldSpec>(
    #[linked] encrypted_deposit: BfvSigned<F>,
    #[public] public_deposit: Field<F>,
) {
    let encrypted_deposit = encrypted_deposit.into_field_elem();
    encrypted_deposit.constrain_eq(public_deposit);
}

/// Validate a balance refresh. We must prove that the two values are equal and that the fresh
/// balance is freshly encoded.
#[zkp_program]
fn validate_refresh_balance<F: FieldSpec>(
    #[linked] existing_balance: BfvSigned<F>,
    #[linked] fresh_balance: BfvSigned<F>,
) {
    fresh_balance.constrain_fresh_encoding();
    fresh_balance
        .into_field_elem()
        .constrain_eq(existing_balance.into_field_elem());
}

/// A way to identify a user.
type Username = String;

/// Perspective of a user.
pub struct User {
    pub name: Username,
    pub public_key: PublicKey,
    private_key: PrivateKey,
    // This app holds ZKP programs used to make proofs
    app: App,
    // The runtime is used for encryption/decryption and creating proofs
    runtime: FheZkpRuntime<BulletproofsBackend>,
}

impl User {
    pub fn new(name: &str) -> Result<Self> {
        let app = App::new()?;
        let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
        let (public_key, private_key) = runtime.generate_keys()?;
        Ok(Self {
            name: name.to_string(),
            runtime,
            public_key,
            private_key,
            app,
        })
    }

    /// Create a private, validated transfer to send to another user.
    pub fn create_transfer<U: Into<Username>>(
        &self,
        chain: &Chain,
        amount: i64,
        receiver: U,
    ) -> Result<Transfer> {
        let receiver = receiver.into();
        let mut builder = self.runtime.linkedproof_builder();

        // Encrypt tx amount under sender's public key.
        println!("    {}: encrypting {} under own key", self.name, amount);
        let (encrypted_amount_sender, amount_linked) =
            builder.encrypt_returning_link(&Signed::from(amount), &self.public_key)?;

        // Encrypt tx amount under receiver's public key, implicitly proving that the two
        // ciphertexts encrypt the same value.
        println!(
            "    {}: encrypting {} under receiver key",
            self.name, amount
        );
        let recv_pk = chain.keys.get(&receiver).unwrap();
        let encrypted_amount_receiver = builder.reencrypt(&amount_linked, recv_pk)?;

        // Decrypt current balance, needed to prove tx validity
        let balance_enc = chain.balances.get(&self.name).unwrap();
        let (balance, balance_linked) =
            builder.decrypt_returning_link::<Signed>(balance_enc, &self.private_key)?;

        // Create transfer proof
        println!(
            "    {}: creating transfer linkedproof, proving {} <= {}",
            self.name, amount, balance
        );
        let proof = builder
            .zkp_program(self.app.get_transfer_zkp())?
            .linked_input(amount_linked)
            .linked_input(balance_linked)
            .build()?;

        Ok(Transfer {
            proof,
            sender: self.name.clone(),
            receiver,
            encrypted_amount_sender,
            encrypted_amount_receiver,
        })
    }

    /// Create a public deposit to a private balance.
    pub fn create_deposit(&self, amount: i64) -> Deposit {
        Deposit {
            public_amount: amount,
            name: self.name.clone(),
        }
    }

    /// Create a refresh balance transaction.
    pub fn create_refresh_balance(&self, chain: &Chain) -> Result<RefreshBalance> {
        let mut builder = self.runtime.linkedproof_builder();

        // Decrypt current balance, returning a link to the underlying message
        let balance_encrypted = chain.balances.get(&self.name).unwrap();
        let (balance, existing_link) =
            builder.decrypt_returning_link::<Signed>(balance_encrypted, &self.private_key)?;

        // Re-encrypt the current balance, returning a link to the underlying message
        println!("    {}: re-encrypting balance of {}", self.name, balance);
        let (fresh_balance, fresh_link) =
            builder.encrypt_returning_link(&balance, &self.public_key)?;

        // Generate proof that the ciphertexts encrypt the same underlying message and that
        // the new one has a fresh noise budget and fresh encoding.
        println!("    {}: creating refresh balance linkedproof", self.name);
        let proof = builder
            .zkp_program(self.app.get_refresh_balance_zkp())?
            .linked_input(existing_link)
            .linked_input(fresh_link)
            .build()?;

        Ok(RefreshBalance {
            proof,
            fresh_balance,
            name: self.name.clone(),
        })
    }

    pub fn create_register(&self, initial_deposit: i64) -> Result<Register> {
        let mut builder = self.runtime.linkedproof_builder();

        // Encrypt deposit amount
        println!(
            "    {}: encrypting and linking {}",
            self.name, initial_deposit
        );
        let (amount_enc, amount_linked) =
            builder.encrypt_returning_link(&Signed::from(initial_deposit), &self.public_key)?;

        // Create registration proof
        println!("    {}: creating registration linkedproof", self.name);
        let proof = builder
            .zkp_program(self.app.get_registration_zkp())?
            .linked_input(amount_linked)
            .public_input(BulletproofsField::from(initial_deposit))
            .build()?;

        Ok(Register {
            proof,
            encrypted_amount: amount_enc,
            public_key: self.public_key.clone(),
            deposit: self.create_deposit(initial_deposit),
        })
    }
}

/// A register transaction.
///
/// The SDLP in the linked proof proves that the ciphertext is a valid, fresh encryption. The R1CS
/// ZKP in the linked proof proves that the amount encrypted matches the public amount deposited.
#[derive(Clone)]
pub struct Register {
    proof: LinkedProof,
    public_key: PublicKey,
    encrypted_amount: Ciphertext,
    deposit: Deposit,
}

/// A public deposit transaction.
#[derive(Clone)]
pub struct Deposit {
    public_amount: i64,
    name: Username,
}

/// A private transfer transaction.
///
/// The SDLP in the linked proof proves that the ciphertexts are valid, fresh encryptions of the
/// same value. The R1CS ZKP in the linked proof proves that the amount encrypted does not exceed
/// the sender's current balance.
#[derive(Clone)]
pub struct Transfer {
    proof: LinkedProof,
    // Transfer amount encrypted under sender's key
    encrypted_amount_sender: Ciphertext,
    // Transfer amount encrypted under receiver's key
    encrypted_amount_receiver: Ciphertext,
    sender: Username,
    receiver: Username,
}

/// A refresh private balance transaction.
///
/// The SDLP in the linked proof proves that the fresh balance is a valid, fresh encryption (to
/// avoid overflowing the noise budget). The R1CS ZKP in the linked proof proves that the new
/// encryption is also _freshly encoded_ (to avoid overflowing the plaintext modulus) and that it
/// matches the existing value on chain.
#[derive(Clone)]
pub struct RefreshBalance {
    proof: LinkedProof,
    fresh_balance: Ciphertext,
    name: Username,
}

/// A chain transaction.
pub enum Transaction {
    Register(Register),
    Deposit(Deposit),
    Transfer(Transfer),
    RefreshBalance(RefreshBalance),
}

/// Perspective of the blockchain, basically just a place where user's encrypted balances are
/// stored and transparent FHE computations take place in the form of atomic transactions.
///
/// In this simple example, assume read-only references `&Chain` provide "call" functionalities,
/// i.e. non-mutating methods for reading chain data, and mutable references `&mut Chain` provide
/// "send" functionalities, i.e. sending transactions that can mutate chain data.
pub struct Chain {
    /// The current balances
    balances: HashMap<Username, Ciphertext>,
    /// The user's public keys
    keys: HashMap<Username, PublicKey>,
    /// Ledger of transactions
    ledger: Vec<Transaction>,
    /// App holding FHE and ZKP programs
    app: App,
    /// Runtime to run FHE programs and verify proofs
    runtime: FheZkpRuntime<BulletproofsBackend>,
}

impl Chain {
    pub fn new() -> Result<Self> {
        let app = App::new()?;
        let runtime = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;
        Ok(Self {
            balances: HashMap::new(),
            keys: HashMap::new(),
            ledger: Vec::new(),
            runtime,
            app,
        })
    }

    pub fn register(&mut self, register: Register) -> Result<()> {
        self.ledger.push(Transaction::Register(register.clone()));
        let Register {
            proof,
            encrypted_amount,
            public_key,
            deposit,
        } = register;

        // First, verify that the encrypted amount matches the public amount
        let mut builder = self.runtime.linkedproof_verification_builder();
        builder.encrypt_returning_link::<Signed>(&encrypted_amount, &public_key)?;
        builder
            .zkp_program(self.app.get_registration_zkp())?
            .proof(proof)
            .public_input(BulletproofsField::from(deposit.public_amount))
            .verify()?;

        // Register the user's public key
        self.keys.insert(deposit.name.clone(), public_key);

        // Set the initial encrypted balance
        self.balances.insert(deposit.name, encrypted_amount);
        Ok(())
    }

    pub fn deposit(&mut self, deposit: Deposit) -> Result<()> {
        self.ledger.push(Transaction::Deposit(deposit.clone()));
        let Deposit {
            public_amount,
            name,
        } = deposit;

        // Deposit into the user's balance
        let pk = self.keys.get(&name).unwrap();
        let curr_bal = self.balances.get_mut(&name).unwrap();
        *curr_bal = self
            .runtime
            .run::<FheProgramInput>(
                self.app.get_deposit_to_fhe(),
                vec![curr_bal.clone().into(), Signed::from(public_amount).into()],
                pk,
            )?
            .remove(0);
        Ok(())
    }

    pub fn transfer(&mut self, transfer: Transfer) -> Result<()> {
        self.ledger.push(Transaction::Transfer(transfer.clone()));
        let Transfer {
            proof,
            encrypted_amount_sender,
            encrypted_amount_receiver,
            sender,
            receiver,
        } = transfer;

        // First verify the transfer is valid
        let mut builder = self.runtime.linkedproof_verification_builder();
        let link = builder.encrypt_returning_link::<Signed>(
            &encrypted_amount_sender,
            self.keys.get(&sender).unwrap(),
        )?;
        builder.reencrypt(
            &link,
            &encrypted_amount_receiver,
            self.keys.get(&receiver).unwrap(),
        )?;
        builder.decrypt_returning_link::<Signed>(self.balances.get(&sender).unwrap())?;
        builder
            .zkp_program(self.app.get_transfer_zkp())?
            .proof(proof)
            .verify()?;

        // Update the sender's balance:
        let sender_pk = self.keys.get(&sender).unwrap();
        let sender_balance = self.balances.get_mut(&sender).unwrap();
        *sender_balance = self
            .runtime
            .run(
                self.app.get_transfer_from_fhe(),
                vec![sender_balance.clone(), encrypted_amount_sender],
                sender_pk,
            )?
            .remove(0);

        // Update receiver's balance
        let receiver_pk = self.keys.get(&receiver).unwrap();
        let receiver_balance = self.balances.get_mut(&receiver).unwrap();
        *receiver_balance = self
            .runtime
            .run(
                self.app.get_transfer_to_fhe(),
                vec![receiver_balance.clone(), encrypted_amount_receiver],
                receiver_pk,
            )?
            .remove(0);
        Ok(())
    }

    pub fn refresh_balance(&mut self, refresh_balance: RefreshBalance) -> Result<()> {
        self.ledger
            .push(Transaction::RefreshBalance(refresh_balance.clone()));
        let RefreshBalance {
            proof,
            fresh_balance,
            name,
        } = refresh_balance;

        // Verify the balance refresh is valid
        let mut builder = self.runtime.linkedproof_verification_builder();
        builder.decrypt_returning_link::<Signed>(self.balances.get(&name).unwrap())?;
        builder.encrypt_returning_link::<Signed>(&fresh_balance, self.keys.get(&name).unwrap())?;
        builder
            .zkp_program(self.app.get_refresh_balance_zkp())?
            .proof(proof)
            .verify()?;

        // Use the freshly encrypted balance
        self.balances
            .insert(name, fresh_balance)
            .expect("User should be registered");
        Ok(())
    }

    pub fn print_ledger(&self) {
        for (i, tx) in self.ledger.iter().enumerate() {
            match tx {
                Transaction::Register(r) => println!("{i}. User {} registered", r.deposit.name,),
                Transaction::Deposit(d) => {
                    println!("{i}. User {} deposited {}", d.name, d.public_amount)
                }
                Transaction::Transfer(t) => println!(
                    "{i}. User {} transferred <ENCRYPTED> to {}",
                    t.sender, t.receiver
                ),
                Transaction::RefreshBalance(b) => {
                    println!("{i}. User {} refreshed their balance", b.name)
                }
            }
        }
    }
}

pub struct App(FheZkpApplication);

impl App {
    pub fn new() -> Result<Self> {
        let app = Compiler::new()
            .fhe_program(transfer_to)
            .fhe_program(transfer_from)
            .fhe_program(deposit_to)
            // These params are not necessary to run the example, but they do shave a few
            // minutes off the runtime. In practice, you probably want to use the default
            // parameters provided by the compiler. The ones set here will result in balances
            // needing to be refreshed more often.
            .with_params(&Params {
                lattice_dimension: 1024,
                coeff_modulus: vec![0x7e00001],
                plain_modulus: 512,
                scheme_type: sunscreen::SchemeType::Bfv,
                security_level: sunscreen::SecurityLevel::TC128,
            })
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(validate_transfer)
            .zkp_program(validate_registration)
            .zkp_program(validate_refresh_balance)
            .compile()?;
        Ok(Self(app))
    }

    pub fn get_transfer_zkp(&self) -> &CompiledZkpProgram {
        self.0.get_zkp_program(validate_transfer).unwrap()
    }

    pub fn get_registration_zkp(&self) -> &CompiledZkpProgram {
        self.0.get_zkp_program(validate_registration).unwrap()
    }

    pub fn get_refresh_balance_zkp(&self) -> &CompiledZkpProgram {
        self.0.get_zkp_program(validate_refresh_balance).unwrap()
    }

    pub fn get_transfer_to_fhe(&self) -> &CompiledFheProgram {
        self.0.get_fhe_program(transfer_to).unwrap()
    }

    pub fn get_transfer_from_fhe(&self) -> &CompiledFheProgram {
        self.0.get_fhe_program(transfer_from).unwrap()
    }

    pub fn get_deposit_to_fhe(&self) -> &CompiledFheProgram {
        self.0.get_fhe_program(deposit_to).unwrap()
    }

    pub fn params(&self) -> &Params {
        self.0.params()
    }
}

fn main() -> Result<()> {
    env_logger::init();

    println!("Starting a new chain...");
    let mut chain = Chain::new()?;

    println!();

    println!("Running Alice's transactions...");
    let alice = User::new("Alice")?;
    let deposit = 100;
    println!("Registering with a deposit of {deposit}");
    chain.register(alice.create_register(deposit)?)?;
    let deposit = 50;
    println!("Depositing an extra {deposit}");
    chain.deposit(alice.create_deposit(deposit))?;

    println!();

    println!("Running Bob's transactions...");
    let bob = User::new("Bob")?;
    let deposit = 100;
    println!("Registering with a deposit of {deposit}");
    chain.register(bob.create_register(deposit)?)?;
    let tx = 50;
    println!("Transfering {tx} to Alice");
    chain.transfer(bob.create_transfer(&chain, tx, "Alice")?)?;

    println!();

    println!("Refreshing Alice's balance...");
    let refresh_balance = alice.create_refresh_balance(&chain)?;
    chain.refresh_balance(refresh_balance)?;

    println!("Done!");

    println!();
    println!("========================== Ledger ==========================");
    println!();
    chain.print_ledger();

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn main_works() -> Result<()> {
        main()
    }
}
