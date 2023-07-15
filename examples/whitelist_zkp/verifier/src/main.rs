use std::io;

use anyhow::Result;
use sunscreen::{
    bulletproofs::BulletproofsBackend, types::zkp::BulletproofsField, Compiler, Proof, ZkpRuntime,
};

use zkp::{default_list, whitelist};

fn main() -> Result<()> {
    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(whitelist)
        .compile()?;
    let prog = app.get_zkp_program(whitelist).unwrap();
    let runtime = ZkpRuntime::new(BulletproofsBackend::new())?;

    let proof: Proof = bincode::deserialize_from(io::stdin())?;

    let list: [BulletproofsField; 100] = default_list();
    runtime.verify(prog, &proof, vec![], vec![list])?;

    println!("Verified proof successfully!");
    Ok(())
}
