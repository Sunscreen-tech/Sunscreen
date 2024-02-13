use sunscreen::{
    bulletproofs::BulletproofsBackend,
    fhe_program,
    linked::LogProofBuilder,
    types::{
        bfv::Signed,
        zkp::{AsFieldElement, BfvSigned, BulletproofsField, ConstrainCmp, Field, FieldSpec},
        Cipher,
    },
    zkp_program, zkp_var, Compiler, FheZkpRuntime, PlainModulusConstraint, Result,
};

#[fhe_program(scheme = "bfv")]
fn update_balance(tx: Cipher<Signed>, balance: Signed) -> Cipher<Signed> {
    balance - tx
}

#[zkp_program]
fn valid_transaction<F: FieldSpec>(#[linked] tx: BfvSigned<F>, #[public] balance: Field<F>) {
    let tx = tx.into_field_elem();

    // Constraint that tx is less than or equal to balance
    tx.constrain_le_bounded(balance, 64);

    // Constraint that tx is greater than zero
    tx.constrain_gt_bounded(zkp_var!(0), 64);
}

fn main() -> Result<()> {
    println!("Compiling FHE and ZKP programs...");
    let app = Compiler::new()
        .fhe_program(update_balance)
        // this is not strictly necessary, but will help performance
        .plain_modulus_constraint(PlainModulusConstraint::Raw(1024))
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(valid_transaction)
        .compile()?;
    let rt = FheZkpRuntime::new(app.params(), &BulletproofsBackend::new())?;

    let valid_tx_zkp = app.get_zkp_program(valid_transaction).unwrap();

    println!("Generating FHE keys...");
    let (public_key, _secret_key) = rt.generate_keys()?;

    let balance = 2002_i64;
    let tx = 5_i64;
    println!("Using balance {balance} and tx {tx}...");
    let balance = BulletproofsField::from(balance);
    let tx = Signed::from(tx);

    let mut proof_builder = LogProofBuilder::new(&rt);

    println!("Encrypting and sharing transaction...");
    let (_ct, tx_msg) = proof_builder.encrypt_returning_link(&tx, &public_key)?;

    println!("Building linkedproof...");
    let lp = proof_builder
        .zkp_program(valid_tx_zkp)?
        .linked_input(tx_msg)
        .public_input(balance)
        .build_linkedproof()?;

    println!("Verifying linkedproof...");
    lp.verify(valid_tx_zkp, vec![BulletproofsField::from(balance)], vec![])?;

    println!("Success! Transaction is valid.");
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
