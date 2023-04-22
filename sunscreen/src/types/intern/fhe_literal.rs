use crypto_bigint::UInt;

/**
 * Tags types (e.g. u64, f64, etc) so they can be used as literals
 * in FHE programs with the GraphCipherConst* traits.
 */
pub trait FheLiteral {}
impl FheLiteral for f64 {}
impl FheLiteral for u64 {}
impl FheLiteral for i64 {}
impl<const LIMBS: usize> FheLiteral for UInt<LIMBS> {} // is this true?
