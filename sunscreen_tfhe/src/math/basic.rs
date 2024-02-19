/// An integer type that supports rounding division.
pub trait RoundedDiv {
    /// Divides two numbers and rounds the result to the nearest integer.
    fn div_rounded(&self, divisor: Self) -> Self;
}

macro_rules! div_rounded {
    ($t:ty) => {
        impl RoundedDiv for $t {
            #[inline(always)]
            fn div_rounded(&self, divisor: $t) -> $t {
                // There are a few ways to do this, but we chose the following
                // because it allows the entire range of a type to be used. The
                // other common method is to add half the divisor to the
                // numerator, but that effectively cuts the size of the possible
                // inputs in half before overflow.
                let q = self / divisor;
                let r = self % divisor;
                if r >= divisor / 2 {
                    q + 1
                } else {
                    q
                }
            }
        }
    };
}

div_rounded!(u8);
div_rounded!(u16);
div_rounded!(u32);
div_rounded!(u64);
div_rounded!(u128);
div_rounded!(usize);
div_rounded!(i8);
div_rounded!(i16);
div_rounded!(i32);
div_rounded!(i64);
div_rounded!(i128);
div_rounded!(isize);

#[cfg(test)]
mod tests {
    use rand::{thread_rng, RngCore};

    use super::*;

    #[test]
    fn test_div_rounded() {
        for _ in 0..1_000 {
            let a = thread_rng().next_u64();
            let mut b = thread_rng().next_u64();

            if b == 0 {
                b = 1;
            }

            let expected = ((a as f64) / (b as f64)).round() as u64;
            let actual = a.div_rounded(b);

            assert_eq!(expected, actual);
        }
    }
}
