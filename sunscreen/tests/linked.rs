use logproof::test::seal_bfv_encryption_linear_relation;
use sunscreen::Error;
use sunscreen::{
    types::zkp::{ConstrainCmp, Field, FieldSpec, ProgramNode},
    zkp_program, zkp_var, Compiler,
};
use sunscreen_runtime::LinkedProof;

use logproof::rings::SealQ128_1024;
use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;

// We copy the sunscreen_zkp_backend::bulletproofs::BulletproofsField type here
// because we can't import it directly from sunscreen_zkp_backend without
// enabling the "bulletproofs" feature
type BulletproofsField =
    Field<<sunscreen_zkp_backend::bulletproofs::BulletproofsBackend as sunscreen_zkp_backend::ZkpBackend>::Field>;

/// Convert a twos complement represented signed integer into a field element.
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

#[test]
fn test_validated_transaction_example() -> Result<(), Error> {
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

    println!("Performing linked verify");
    lp.verify(
        valid_transaction_zkp,
        vec![BulletproofsField::from(balance)],
        vec![],
    )
    .expect("Failed to verify linked proof");
    println!("Linked verify done");

    Ok(())
}
