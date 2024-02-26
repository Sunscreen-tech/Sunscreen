// ANCHOR: all
// ANCHOR: imports
use sunscreen::{
    bulletproofs::BulletproofsBackend,
    fhe_program,
    linked::{LinkedProof, LinkedProofBuilder},
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
    ZkpProgramInput, Error
};
// ANCHOR_END: imports

// ANCHOR: progs
// ANCHOR: fhe_prog
#[fhe_program(scheme = "bfv")]
fn increase_by_factor(x: Signed, scale: Cipher<Signed>) -> Cipher<Signed> {
    x * scale
}
// ANCHOR_END: fhe_prog

// ANCHOR: zkp_prog
#[zkp_program]
fn is_greater_than_one<F: FieldSpec>(#[linked] scale: BfvSigned<F>) {
    scale.into_field_elem().constrain_gt_bounded(zkp_var!(1), 64);
}
// ANCHOR_END: zkp_prog
// ANCHOR_END: progs
// ANCHOR: none
// ANCHOR_END: none
// ANCHOR_END: all
