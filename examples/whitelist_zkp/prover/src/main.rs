use std::io;

use anyhow::Result;
use sunscreen::{
    bulletproofs::BulletproofsBackend, types::zkp::BulletproofsField, ZkpProgramFnExt,
};

use zkp::{default_list, whitelist};

fn main() -> Result<()> {
    let prog = whitelist.compile::<BulletproofsBackend>()?;
    let runtime = whitelist.runtime(BulletproofsBackend::new())?;

    let entry: BulletproofsField = get_first_arg()?.unwrap_or(101).into();
    let list: [BulletproofsField; 100] = default_list();

    let proof = runtime
        .proof_builder(&prog)
        .private_input(entry)
        .public_input(list)
        .prove()?;

    bincode::serialize_into(io::stdout(), &proof)?;
    Ok(())
}

fn get_first_arg() -> Result<Option<u32>> {
    let arg = std::env::args().nth(1).map(|s| s.parse()).transpose()?;
    Ok(arg)
}
