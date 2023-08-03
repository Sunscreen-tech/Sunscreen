use std::marker::PhantomData;

use crypto_bigint::Uint;

use super::ArithmeticBackend;

pub struct MontBackend<const N: usize, C: MontConfig<N>> {
    _phantom: PhantomData<C>,
}

pub trait MontConfig<const N: usize> {
    /// The modulus q that defines F_q. This needn't be prime.
    const MODULUS: Uint<N>;

    /// The R term for putting values into Montgomery form.
    const R: Uint<N>;

    const R_INV: Uint<N>;
}

impl<const N: usize, C: MontConfig<N>> ArithmeticBackend<N> for MontBackend<N, C> {
    const MODULUS: Uint<N> = C::MODULUS;

    fn mul_mod(lhs: &Uint<N>, rhs: &Uint<N>) -> Uint<N> {
        todo!();
    }
}
