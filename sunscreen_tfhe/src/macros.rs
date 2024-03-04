macro_rules! impl_binary_op {
    ($op:ident, $type:ty, ($($t_bounds:ty),* $(,)? )) => {
        paste::paste! {

            // Ex: AddAssign for LweSecretKey
            impl<S> std::ops::[<$op Assign>] for $type<S>
            where
                S: $($t_bounds)*
            {
                fn [<$op:lower _assign>](&mut self, rhs: Self) {
                    self.data.iter_mut().zip(rhs.data.iter()).for_each(|(a, b)| {
                        *a = num::traits::[<Wrapping $op>]::[<wrapping_ $op:lower>](a, b);
                    });
                }
            }

            // Ex: Add for LweSecretKey
            // Calls Add for &LweSecretKeyRef
            impl<S> std::ops::$op for $type<S>
            where
                S: TorusOps,
            {
                type Output = Self;

                fn [<$op:lower >](self, rhs: Self) -> Self::Output {
                    std::ops::$op::[< $op:lower >](self.as_ref(), rhs.as_ref())
                }
            }

            // Ex: WrappingAdd for LweSecretKey
            // Calls Add for &LweSecretKeyRef
            impl<S> num::traits::[<Wrapping $op>] for $type<S>
            where
                S: TorusOps,
            {
                fn [<wrapping_ $op:lower>](&self, rhs: &Self) -> Self {
                    std::ops::$op::[< $op:lower >](self.as_ref(), rhs.as_ref())
                }
            }

            // Ex: Add for &LweSecretKeyRef
            // Calls AddAssign for LweSecretKey
            impl<S> std::ops::$op for &[<$type Ref>]<S>
            where
                S: TorusOps,
            {
                type Output = $type<S>;

                fn [< $op:lower >](self, rhs: Self) -> Self::Output {
                    let mut a = self.to_owned();
                    std::ops::[< $op Assign >]::[< $op:lower _assign>](&mut a, rhs.to_owned());
                    a
                }
            }
        }
    };
}

macro_rules! impl_unary_op {
    ($op:ident, $type:ty) => {
        paste::paste! {

            // Ex: Neg for LweSecretKey
            // Calls Neg for &LweSecretKeyRef
            impl<S> std::ops::$op for $type<S>
            where
                S: TorusOps,
            {
                type Output = Self;

                fn [<$op:lower>](self) -> Self::Output {
                    std::ops::$op::[<$op:lower>](self.as_ref())
                }
            }

            // Ex: Neg for &LweSecretKeyRef
            impl<S> std::ops::$op for &[<$type Ref>]<S>
            where
                S: TorusOps,
            {
                type Output = $type<S>;

                fn [<$op:lower>](self) -> Self::Output {
                    // We call the wrapping trait instead of using the dot
                    // syntax because the dot syntax can dereference the value
                    // and can cause problems with Deref.
                    let data = aligned_vec::AVec::from_iter(crate::scratch::SIMD_ALIGN, self.data.iter().map(|a| num::traits::[<Wrapping $op>]::[<wrapping_ $op:lower>](a)));

                    $type { data }
                }
            }

            // Ex: WrappingNeg for LweSecretKey
            // Calls Neg for &LweSecretKeyRef
            impl<S> num::traits::[<Wrapping $op>] for $type<S>
            where
                S: TorusOps,
            {
                fn [<wrapping_ $op:lower>](&self) -> Self {
                    std::ops::$op::[<$op:lower>](self.as_ref())
                }
            }
        }
    };
}

pub(crate) use impl_binary_op;
pub(crate) use impl_unary_op;
