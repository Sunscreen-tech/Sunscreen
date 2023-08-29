/// For an algebraic structure, this defines the additive identity.
pub trait Zero
where
    Self: Sized,
{
    /// The additive identity.
    const ZERO: Self;
}

/// For an algebraic structure, this defines the multiplicative identity.
pub trait One
where
    Self: Sized,
{
    /// The multiplicative identity.
    const ONE: Self;
}
