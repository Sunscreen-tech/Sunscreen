use std::ops::Add;

use petgraph::stable_graph::NodeIndex;

use crate::{Ciphertext, Context, CURRENT_CTX};

#[derive(Clone, Copy)]
pub struct Signed {
    pub id: NodeIndex,
}

impl Ciphertext for Signed {
    fn new() -> Self {
        with_ctx(|ctx| Self {
            id: ctx.add_input(),
        })
    }
}

impl Signed {}

impl Add for Signed {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        with_ctx(|ctx| Self {
            id: ctx.add_addition(self.id, other.id),
        })
    }
}

fn with_ctx<F, R>(f: F) -> R
where
    F: FnOnce(&mut Context) -> R,
{
    CURRENT_CTX.with(|ctx| {
        let mut option = ctx.borrow_mut();
        let ctx = option
            .as_mut()
            .expect("Called Ciphertext::new() outside of a context.");

        f(ctx)
    })
}
