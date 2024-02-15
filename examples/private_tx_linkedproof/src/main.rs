#![allow(unused)]

//! In this example, we demonstrate how to use a [`LinkedProof`] to verify a private transaction.
//! We assume the private transactions are implemented on a transparent system like a blockchain,
//! where deterministic computation is performed on encrypted data. The linked proofs allow us to
//! validate the encrypted inputs.

use std::collections::{hash_map::Entry, HashMap};

use once_cell::sync::Lazy;
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
    FheZkpApplication, FheZkpRuntime, Params, PlainModulusConstraint, PrivateKey, PublicKey,
    Result, ZkpProgramInput,
};

/// Subtract the transaction amount from the sender's balance.
#[fhe_program(scheme = "bfv")]
fn update_balance_sender(balance: Cipher<Signed>, tx: Cipher<Signed>) -> Cipher<Signed> {
    balance - tx
}

/// Add the transaction amount to the receiver's balance.
#[fhe_program(scheme = "bfv")]
fn update_balance_receiver(balance: Cipher<Signed>, tx: Cipher<Signed>) -> Cipher<Signed> {
    balance + tx
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

/// Validate deposit/registration. The deposit amount is public, but we must prove that the
/// provided ciphertext encrypts the deposit amount.
#[zkp_program]
fn validate_deposit<F: FieldSpec>(
    #[linked] encrypted_deposit: BfvSigned<F>,
    #[public] public_deposit: Field<F>,
) {
    let encrypted_deposit = encrypted_deposit.into_field_elem();
    encrypted_deposit.constrain_eq(public_deposit);
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
        let mut builder = LogProofBuilder::new(&self.runtime);

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
        let encrypted_amount_receiver = builder.encrypt_msg(&amount_linked, recv_pk)?;

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
            .build_linkedproof()?;

        Ok(Transfer {
            proof,
            sender: self.name.clone(),
            receiver,
            encrypted_amount_sender,
            encrypted_amount_receiver,
        })
    }

    /// Create a public deposit to a private balance.
    pub fn create_deposit(&self, amount: i64) -> Result<Deposit> {
        let mut builder = LogProofBuilder::new(&self.runtime);

        // Encrypt deposit amount
        println!("    {}: encrypting and linking {}", self.name, amount);
        let (amount_enc, amount_linked) =
            builder.encrypt_returning_link(&Signed::from(amount), &self.public_key)?;

        // Create deposit proof
        println!("    {}: creating deposit linkedproof", self.name);
        let proof = builder
            .zkp_program(self.app.get_deposit_zkp())?
            .linked_input(amount_linked)
            .public_input(BulletproofsField::from(amount))
            .build_linkedproof()?;

        Ok(Deposit {
            proof,
            encrypted_amount: amount_enc,
            public_amount: amount,
            name: self.name.clone(),
        })
    }

    /// Create a refresh balance transaction.
    pub fn create_refresh_balance(&self, chain: &Chain) -> Result<RefreshBalance> {
        let mut builder = LogProofBuilder::new(&self.runtime);

        // Decrypt current balance, returning a reference to the underlying message
        let balance_encrypted = chain.balances.get(&self.name).unwrap();
        let (balance, msg) =
            builder.decrypt_returning_msg::<Signed>(balance_encrypted, &self.private_key)?;

        // Re-encrypt the current balance
        println!("    {}: re-encrypting balance of {}", self.name, balance);
        let fresh_balance = builder.encrypt_msg(&msg, &self.public_key)?;

        // Generate proof that the ciphertexts encrypt the same underlying message
        println!("    {}: creating refresh balance logproof", self.name);
        let proof = builder.build_logproof()?;

        Ok(RefreshBalance {
            proof,
            fresh_balance,
            name: self.name.clone(),
        })
    }

    pub fn create_register(&self, initial_deposit: i64) -> Result<Register> {
        let deposit = self.create_deposit(initial_deposit)?;
        Ok(Register {
            public_key: self.public_key.clone(),
            deposit,
        })
    }
}

/// A register transaction is an initial deposit plus an identifying public key.
#[derive(Clone)]
pub struct Register {
    public_key: PublicKey,
    deposit: Deposit,
}

/// A deposit transaction.
///
/// The SDLP in the linked proof proves that the ciphertext is a valid, fresh encryption. The R1CS
/// ZKP in the linked proof proves that the amount encrypted matches the public amount deposited.
#[derive(Clone)]
pub struct Deposit {
    proof: LinkedProof,
    encrypted_amount: Ciphertext,
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
/// The SDLP proves that the fresh balance is a valid, fresh encryption and also that the
/// underlying value matches the current on chain balance.
///
/// Note that this proof is not a linked proof, as these validations can be proven by an
/// [`Sdlp`] alone.
//
// TODO do we need a BfvSigned::constrain_is_fresh_encryption that proves each coefficient's
// absolute value <= 1 and degree is less than 64?
#[derive(Clone)]
pub struct RefreshBalance {
    proof: Sdlp,
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
    // TODO log transactions
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
            public_key,
            deposit,
        } = register;

        self.keys.insert(deposit.name.clone(), public_key);
        self.deposit(deposit)
    }

    pub fn deposit(&mut self, deposit: Deposit) -> Result<()> {
        self.ledger.push(Transaction::Deposit(deposit.clone()));
        let Deposit {
            proof,
            encrypted_amount,
            public_amount,
            name,
        } = deposit;

        // First, verify that the encrypted amount matches the public amount
        proof.verify(
            self.app.get_deposit_zkp(),
            vec![BulletproofsField::from(public_amount)],
            vec![],
        )?;

        // Then deposit into the user's balance
        let pk = self.keys.get(&name).unwrap();
        match self.balances.entry(name) {
            // Update existing balance
            Entry::Occupied(mut entry) => {
                let curr = entry.get().clone();
                let updated = self
                    .runtime
                    .run(
                        self.app.get_update_balance_receiver_fhe(),
                        vec![curr, encrypted_amount],
                        pk,
                    )?
                    .remove(0);
                entry.insert(updated);
            }
            // Or insert the amount if this is an initial deposit
            Entry::Vacant(entry) => {
                entry.insert(encrypted_amount);
            }
        }
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
        proof.verify::<ZkpProgramInput>(self.app.get_transfer_zkp(), vec![], vec![])?;

        // Update the sender's balance:
        let sender_pk = self.keys.get(&sender).unwrap();
        let sender_balance = self.balances.get_mut(&sender).unwrap();
        let new_balance = self
            .runtime
            .run(
                self.app.get_update_balance_sender_fhe(),
                vec![sender_balance.clone(), encrypted_amount_sender],
                sender_pk,
            )?
            .remove(0);
        *sender_balance = new_balance;

        // Update receiver's balance
        let receiver_pk = self.keys.get(&receiver).unwrap();
        let receiver_balance = self.balances.get_mut(&receiver).unwrap();
        let new_balance = self
            .runtime
            .run(
                self.app.get_update_balance_receiver_fhe(),
                vec![receiver_balance.clone(), encrypted_amount_receiver],
                receiver_pk,
            )?
            .remove(0);
        *receiver_balance = new_balance;
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
        // TODO fix logproofs for computed ciphertexts
        // proof.verify()?;

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

pub struct App(&'static Lazy<FheZkpApplication>);

impl App {
    pub fn new() -> Result<Self> {
        static APP: Lazy<FheZkpApplication> = Lazy::new(|| {
            Compiler::new()
                .fhe_program(update_balance_sender)
                .fhe_program(update_balance_receiver)
                .zkp_backend::<BulletproofsBackend>()
                .zkp_program(validate_transfer)
                .zkp_program(validate_deposit)
                .compile()
                .unwrap()
        });
        Ok(Self(&APP))
    }

    pub fn get_transfer_zkp(&self) -> &CompiledZkpProgram {
        self.0.get_zkp_program(validate_transfer).unwrap()
    }

    pub fn get_deposit_zkp(&self) -> &CompiledZkpProgram {
        self.0.get_zkp_program(validate_deposit).unwrap()
    }

    pub fn get_update_balance_sender_fhe(&self) -> &CompiledFheProgram {
        self.0.get_fhe_program(update_balance_sender).unwrap()
    }

    pub fn get_update_balance_receiver_fhe(&self) -> &CompiledFheProgram {
        self.0.get_fhe_program(update_balance_receiver).unwrap()
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
    chain.deposit(alice.create_deposit(deposit)?)?;

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
