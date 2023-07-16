use std::io;

use anyhow::Result;
use sunscreen::{
    bulletproofs::BulletproofsBackend, types::zkp::BulletproofsField, Proof, ZkpProgramFnExt,
};

use zkp::{default_list, whitelist};

fn main() -> Result<()> {
    let prog = whitelist.compile::<BulletproofsBackend>()?;
    let runtime = whitelist.runtime(BulletproofsBackend::new())?;

    let proof: Proof = bincode::deserialize_from(io::stdin())?;

    let list: [BulletproofsField; 100] = default_list();

    runtime
        .verification_builder(&prog)
        .proof(&proof)
        .public_input(list)
        .verify()?;

    runtime.verify(&prog, &proof, vec![list], vec![])?;

    println!("Verified proof successfully!");
    Ok(())
}
