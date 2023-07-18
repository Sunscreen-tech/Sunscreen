use std::io;

use anyhow::Result;
use sunscreen::{
    bulletproofs::BulletproofsBackend, types::zkp::BulletproofsField, Proof, ZkpProgramFnExt,
};

use zkp::{default_list, whitelist};

fn main() -> Result<()> {
    let prog = whitelist.compile::<BulletproofsBackend>()?;
    let runtime = whitelist.runtime::<BulletproofsBackend>()?;

    let proof: Proof = bincode::deserialize_from(io::stdin())?;

    let list: [BulletproofsField; 100] = default_list();

    runtime
        .verification_builder(&prog)
        .proof(&proof)
        .public_input(list)
        .verify()?;

    println!("Verified proof successfully!");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn main_works() -> Result<()> {
        let prog = whitelist.compile::<BulletproofsBackend>()?;
        let runtime = whitelist.runtime::<BulletproofsBackend>()?;

        let entry: BulletproofsField = 101.into();
        let list: [BulletproofsField; 100] = default_list();

        let proof = runtime
            .proof_builder(&prog)
            .private_input(entry)
            .public_input(list)
            .prove()?;

        runtime
            .verification_builder(&prog)
            .proof(&proof)
            .public_input(list)
            .verify()?;

        Ok(())
    }
}
