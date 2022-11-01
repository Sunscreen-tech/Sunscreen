mod fe_compiler;
pub mod types;

pub use crate::fe_compiler::{ZkpContext, ZkpFrontendCompilation};

use std::cell::RefCell;

thread_local! {
    /**
     * While constructing an [`fhe_program`], this refers to the current intermediate
     * representation. An implementation detail of the [`fhe_program`] macro.
     */
    pub static CURRENT_CTX: RefCell<Option<&'static mut ZkpContext>> = RefCell::new(None);
}

/**
 * Runs the specified closure, injecting the current [`fhe_program`] context.
 */
pub fn with_ctx<F, R>(f: F) -> R
where
    F: FnOnce(&mut ZkpContext) -> R,
{
    CURRENT_CTX.with(|ctx| {
        let mut option = ctx.borrow_mut();
        let ctx = option
            .as_mut()
            .expect("Called Ciphertext::new() outside of a context.");

        f(ctx)
    })
}
