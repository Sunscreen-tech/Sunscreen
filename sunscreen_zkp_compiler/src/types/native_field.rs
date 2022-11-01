use sunscreen_compiler_common::{Type, TypeName};

use crate::{
    fe_compiler::ZkpContextOps,
    types::{AddVar, ProgramNode},
    with_ctx,
};

use super::{MulVar, NegVar, NumFieldElements, ZkpType};

use semver::Version;

// Shouldn't need Clone + Copy, but there appears to be a bug in the Rust
// compiler that prevents ProgramNode from being Copy if we don't.
// https://github.com/rust-lang/rust/issues/104264
#[derive(Clone, Copy)]
/**
 * The native field type in the underlying backend proof system. For
 * example, in Bulletproofs, this is [`Scalar`](https://docs.rs/curve25519-dalek-ng/4.1.1/curve25519_dalek_ng/scalar/struct.Scalar.html).
 */
pub struct NativeField {}

impl NumFieldElements for NativeField {
    const NUM_NATIVE_FIELD_ELEMENTS: usize = 1;
}

impl ZkpType for NativeField {}

impl AddVar for NativeField {
    fn add(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_ctx(|ctx| {
            let o = ctx.add_addition(lhs.ids[0], rhs.ids[0]);

            ProgramNode::new(&[o])
        })
    }
}

impl MulVar for NativeField {
    fn mul(lhs: ProgramNode<Self>, rhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_ctx(|ctx| {
            let o = ctx.add_multiplication(lhs.ids[0], rhs.ids[0]);

            ProgramNode::new(&[o])
        })
    }
}

impl NegVar for NativeField {
    fn neg(lhs: ProgramNode<Self>) -> ProgramNode<Self> {
        with_ctx(|ctx| {
            let o = ctx.add_negate(lhs.ids[0]);

            ProgramNode::new(&[o])
        })
    }
}

impl TypeName for NativeField {
    fn type_name() -> Type {
        let version = env!("CARGO_PKG_VERSION");
        let version = Version::parse(version).unwrap();

        Type {
            name: format!("{}::NativeField", module_path!()),
            version,
            is_encrypted: false,
        }
    }
}
