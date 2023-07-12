use std::io;

use anyhow::Result;
use sunscreen::{
    bulletproofs::BulletproofsBackend, types::zkp::BulletproofsField, Compiler, ZkpRuntime,
};

use zkp::{default_list, whitelist};

fn main() -> Result<()> {
    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(whitelist)
        .compile()?;
    let prog = app.get_zkp_program(whitelist).unwrap();
    let runtime = ZkpRuntime::new(&BulletproofsBackend::new())?;

    let entry: BulletproofsField = get_first_arg()?.unwrap_or(101).into();
    let list: [BulletproofsField; 100] = default_list();

    let proof = runtime
        .proof_builder(prog)
        .public_input(list)
        .private_input(entry)
        .prove()?;

    bincode::serialize_into(io::stdout(), &proof)?;
    Ok(())
}

fn get_first_arg() -> Result<Option<u32>> {
    let arg = std::env::args().nth(1).map(|s| s.parse()).transpose()?;
    Ok(arg)
}
