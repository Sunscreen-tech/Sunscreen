mod fe_compiler;
pub mod types;

pub use crate::fe_compiler::{ZkpContext, ZkpFrontendCompilation};

use std::cell::RefCell;

thread_local! {
    /**
     * Contains the graph of a ZKP program during compilation. An 
     * implementation detail and not for public consumption.
     */
    pub static CURRENT_ZKP_CTX: RefCell<Option<&'static mut ZkpContext>> = RefCell::new(None);
}

/**
 * Runs the specified closure, injecting the current [`fhe_program`] context.
 */
pub fn with_zkp_ctx<F, R>(f: F) -> R
where
    F: FnOnce(&mut ZkpContext) -> R,
{
    CURRENT_ZKP_CTX.with(|ctx| {
        let mut option = ctx.borrow_mut();
        let ctx = option
            .as_mut()
            .expect("Called with_zkp_ctx() outside of a context.");

        f(ctx)
    })
}
