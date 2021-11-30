use std::ops::{Add, Mul, Shl, Shr};

use petgraph::stable_graph::NodeIndex;
use serde::{Serialize, Deserialize};

use crate::{Value, Context, CURRENT_CTX, Literal};

#[derive(Clone, Copy, Serialize, Deserialize)]
struct LiteralRef {
    pub id: NodeIndex,
}

impl LiteralRef {
    fn new(v: Literal) -> Self {
        with_ctx(|ctx|
            Self {
            id: ctx.add_literal(v),
        }) 
    }
}

#[derive(Clone, Copy)]
pub struct Signed {
    pub id: NodeIndex,
}

impl Value for Signed {
    fn new() -> Self {
        with_ctx(|ctx| Self {
            id: ctx.add_input(),
        })
    }

    fn output(&self) -> Self {
        with_ctx(|ctx| Self {
            id: ctx.add_output(self.id)
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

impl Mul for Signed {
    type Output = Self;

    fn mul(self, other: Self) -> Self {
        with_ctx(|ctx| Self {
            id: ctx.add_multiplication(self.id, other.id),
        })
    }
}

impl Shl<u64> for Signed {
    type Output = Self;

    fn shl(self, n: u64) -> Self {
        let l = LiteralRef::new(Literal::U64(n));

        with_ctx(|ctx| Self {
            id: ctx.add_rotate_left(self.id, l.id)
        })
    }
}

impl Shr<u64> for Signed {
    type Output = Self;

    fn shr(self, n: u64) -> Self {
        let l = LiteralRef::new(Literal::U64(n));

        with_ctx(|ctx| Self {
            id: ctx.add_rotate_right(self.id, l.id)
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
