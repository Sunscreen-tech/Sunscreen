use curve25519_dalek::scalar::Scalar;

/// For an algebraic structure, this defines the additive identity.
pub trait Zero
where
    Self: Sized,
{
    /// The additive identity.
    fn zero() -> Self;

    /// Whether or not this item is zero.
    fn vartime_is_zero(&self) -> bool;
}

/// For an algebraic structure, this defines the multiplicative identity.
pub trait One
where
    Self: Sized,
{
    /// The multiplicative identity.
    fn one() -> Self;
}

impl Zero for Scalar {
    fn zero() -> Self {
        Self::zero()
    }

    fn vartime_is_zero(&self) -> bool {
        self == &Scalar::zero()
    }
}

impl One for Scalar {
    fn one() -> Self {
        Self::one()
    }
}

/// Methods for switching elements between finite rings.
pub trait ModSwitch<R> {
    /// Treat the input value as unsigned in the current Ring and produce
    /// the same unsigned value in the ring `R`.
    fn mod_switch_unsigned(&self) -> R;

    /// Treat the input value as signed in the current field
    /// (i.e. [-q/2, q/2]) and produce the same signed value in `R`
    /// (i.e. [-p/2, p/2]).
    fn mod_switch_signed(&self) -> R;
}
