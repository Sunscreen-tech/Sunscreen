use std::ops::{Add, Mul, Shl, Shr};

use petgraph::stable_graph::NodeIndex;
use serde::{Deserialize, Serialize};

use crate::{Context, Literal, Value, CURRENT_CTX};

#[derive(Clone, Copy, Serialize, Deserialize)]
struct LiteralRef {
    pub id: NodeIndex,
}

impl LiteralRef {
    fn new(v: Literal) -> Self {
        with_ctx(|ctx| Self {
            id: ctx.add_literal(v),
        })
    }
}

/**
 * Denotes the given rust type is an encoding in an FHE scheme
 */
pub trait FheType {}

/**
 * Denotes the given type is valid under the [SchemeType::BFV].
 */
pub trait BfvType : FheType {
}

#[derive(Clone, Copy)]
/**
 * Represents a single signed integer encrypted as a ciphertext. Suitable for use
 * as an input or output for a Sunscreen circuit.
 */
pub struct Signed {
    /**
     * The internal graph node id of this input or output.
     */
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
            id: ctx.add_output(self.id),
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
            id: ctx.add_rotate_left(self.id, l.id),
        })
    }
}

impl Shr<u64> for Signed {
    type Output = Self;

    fn shr(self, n: u64) -> Self {
        let l = LiteralRef::new(Literal::U64(n));

        with_ctx(|ctx| Self {
            id: ctx.add_rotate_right(self.id, l.id),
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
