use crate::scratch::Pod;

macro_rules! dst {
    ($(#[$meta:meta])* $t:ty, $ref_t:ty, $wrapper:ty, ($($derive:ident),* $(,)? ), ($($t_bounds:ty),* $(,)? )) => {
        paste::paste! {

            $(#[$meta])*
            #[derive($($derive,)*)]
            pub struct $t<T> where T: Clone $(+ $t_bounds)* {
                data: Vec<$wrapper<T>>
            }

            /// A reference to the data structure.
            #[repr(transparent)]
            pub struct $ref_t<T> where T: Clone $(+ $t_bounds)* {
                data: [$wrapper<T>],
            }

            impl<T> $ref_t<T> where T: Clone $(+ $t_bounds)* {
                /// Clones the contents of rhs into self
                pub fn clone_from_ref(&mut self, rhs: &$ref_t<T>) {
                    for (l, r) in self.data.iter_mut().zip(rhs.data.iter()) {
                        *l = r.clone();
                    }
                }

                /// Returns a slice view of the data representing a $t.
                pub fn as_slice(&self) -> &[$wrapper<T>] {
                    &self.data
                }

                /// Returns a mutable slice view of the data representing a $t.
                pub fn as_mut_slice(&mut self) -> &mut [$wrapper<T>] {
                    &mut self.data
                }

                /// Move the contents of rhs into self.
                pub fn move_from(&mut self, rhs: $t<T>) {
                    for (l, r) in self.data.iter_mut().zip(rhs.data.into_iter()) {
                        *l = r;
                    }
                }
            }

            impl<T> crate::dst::FromSlice<$wrapper<T>> for $ref_t<T> where T: Clone $(+ $t_bounds)* {
                fn from_slice(s: &[$wrapper<T>]) -> &$ref_t<T> {
                    unsafe { &*(s as *const [$wrapper<T>] as *const $ref_t<T>) }
                }
            }

            impl<T> crate::dst::FromMutSlice<$wrapper<T>> for $ref_t<T> where T: Clone $(+ $t_bounds)* {
                fn from_mut_slice(s: &mut [$wrapper<T>]) -> &mut $ref_t<T> {
                    unsafe { &mut *(s as *mut [$wrapper<T>] as *mut $ref_t<T>) }
                }
            }

            impl<T> $ref_t<T> where T: Clone $(+ $t_bounds)*, $wrapper<T>: num::Zero {
                /// Clears the contents of self to contain zero
                pub fn clear(&mut self) {

                    for x in self.as_mut_slice() {
                        *x = <$wrapper<T> as num::Zero>::zero();
                    }
                }
            }

            impl<T> std::borrow::Borrow< $ref_t <T>> for $t<T> where T: Clone $(+ $t_bounds)* {
                fn borrow(&self) -> &$ref_t<T> {
                    let ptr = self.data.as_slice() as *const [$wrapper<T>] as *const $ref_t<T>;

                    unsafe { &*ptr }

                }
            }

            impl<T> std::convert::AsRef< $ref_t <T>> for $t<T> where T: Clone $(+ $t_bounds)*
            {
                fn as_ref(&self) -> &$ref_t<T> {
                    <Self as std::borrow::Borrow<$ref_t <T>>>::borrow(self)
                }
            }

            impl<T> std::borrow::BorrowMut< $ref_t<T>> for $t<T> where T: Clone $(+ $t_bounds)* {
                fn borrow_mut(&mut self) -> &mut $ref_t<T> {
                    let ptr = self.data.as_mut_slice() as *mut [$wrapper<T>] as *mut $ref_t<T>;

                    unsafe { &mut *ptr }

                }
            }

            impl<T> std::borrow::ToOwned for $ref_t<T> where T: Clone $(+ $t_bounds)* {
                type Owned = $t<T>;

                fn to_owned(&self) -> Self::Owned {
                    $t { data: self.data.to_owned() }
                }
            }

            impl<T> std::ops::Deref for $t<T> where T: Clone $(+ $t_bounds)* {
                type Target = $ref_t<T>;

                fn deref(&self) -> &Self::Target {
                    <Self as std::borrow::Borrow::<$ref_t<T>>>::borrow(&self)
                }
            }

            impl<T> std::ops::DerefMut for $t<T> where T: Clone $(+ $t_bounds)* {
                fn deref_mut(&mut self) -> &mut Self::Target {
                    <Self as std::borrow::BorrowMut::<$ref_t<T>>>::borrow_mut(self)
                }
            }
        }
    };
}

macro_rules! dst_iter {
    ($t:ty, $t_mut:ty, $wrapper_type: ty, $item_ref:ty, ($($t_bounds:ty,)*)) => {
        paste::paste!{
            /// An iterator to access references to an underlying type.
            pub struct $t<'a, T> where T: Clone $(+ $t_bounds)* {
                data: &'a [$wrapper_type<T>],
                stride: usize,
                front_idx: usize,
                back_idx: i64
            }

            impl<'a, T> $t<'a, T> where T: Clone $(+ $t_bounds)* {
                /// Create a new iterator that emits references to the contained type
                /// by striding over the underlying data.
                pub fn new(data: &'a [$wrapper_type<T>], stride: usize) -> Self {
                    assert_eq!(data.len() % stride, 0);

                    Self {
                        data,
                        stride,
                        front_idx: 0,
                        back_idx: (data.len() as i64) - (stride as i64)
                    }
                }

                #[inline]
                /// The total number of items this iterator will emit and has emitted.
                ///
                /// # Remarks
                /// This method returns the same value regardless of how many times
                /// `next` has been called.
                ///
                /// This operation does not consume the iterator.
                pub fn len(&self) -> usize {
                    self.data.len() / self.stride
                }

                /// Returns true if the iterator is empty.
                #[inline]
                pub fn is_empty(&self) -> bool {
                    self.data.is_empty()
                }
            }

            impl<'a, T> std::iter::Iterator for $t<'a, T> where T: Clone $(+ $t_bounds)* {
                type Item = &'a $item_ref<T>;

                fn next(&mut self) -> Option<Self::Item> {
                    if self.front_idx >= self.data.len() {
                        return None;
                    }

                    if (self.front_idx as i64) == self.back_idx + self.stride as i64 {
                        return None;
                    }

                    let data = <$item_ref<T> as crate::dst::FromSlice<$wrapper_type<T>>>::from_slice(
                        &self.data[self.front_idx..self.front_idx + self.stride]
                    );

                    self.front_idx += self.stride;

                    Some(data)
                }
            }

            impl<'a, T> std::iter::DoubleEndedIterator for $t<'a, T> where T: Clone $(+ $t_bounds)* {
                fn next_back(&mut self) -> Option<Self::Item> {
                    if self.back_idx < 0 {
                        return None;
                    }

                    if (self.front_idx as i64) == self.back_idx  + self.stride as i64 {
                        return None;
                    }

                    let start = self.back_idx as usize;

                    let data = <$item_ref<T> as crate::dst::FromSlice<$wrapper_type<T>>>::from_slice(
                        &self.data[start..start + self.stride]
                    );

                    self.back_idx -= (self.stride as i64);

                    Some(data)
                }
            }

            /// A mutable iterator to access references to an underlying type.
            pub struct $t_mut<'a, T> where T: Clone $(+ $t_bounds)* {
                data: *mut $wrapper_type<T>,
                len: usize,
                stride: usize,
                idx: usize,
                _phantom: std::marker::PhantomData<&'a T>,
            }

            impl<'a, T> $t_mut<'a, T> where T: Clone $(+ $t_bounds)* {
                /// Create a new iterator that emits references to the contained type
                /// by striding over the underlying data, mutably.
                pub fn new(data: &'a mut [$wrapper_type<T>], stride: usize) -> Self {
                    assert_eq!(data.len() % stride, 0);

                    Self {
                        idx: 0,
                        stride,
                        data: data.as_mut_ptr(),
                        len: data.len(),
                        _phantom: std::marker::PhantomData
                    }
                }

                #[inline]
                /// The total number of items this iterator will emit and has emitted.
                ///
                /// # Remarks
                /// This method returns the same value regardless of how many times
                /// `next` has been called.
                ///
                /// This operation does not consume the iterator.
                pub fn len(&self) -> usize {
                    self.len / self.stride
                }

                /// Returns true if the iterator is empty.
                #[inline]
                pub fn is_empty(&self) -> bool {
                    self.len == 0
                }
            }

            impl<'a, T> std::iter::Iterator for $t_mut<'a, T> where T: Clone $(+ $t_bounds)* {
                type Item = &'a mut $item_ref<T>;

                fn next(&mut self) -> Option<Self::Item> {
                    if self.idx == self.len {
                        return None;
                    }

                    // Since the slices emitted by this iterator don't overlap, this is sound.
                    let data = unsafe {
                        let slice = self.data.add(self.idx);
                        std::slice::from_raw_parts_mut(slice, self.stride)
                    };

                    self.idx += self.stride;

                    Some(<$item_ref<T> as crate::dst::FromMutSlice<$wrapper_type<T>>>::from_mut_slice(data))
                }
            }
        }
    };
}

pub type NoWrapper<T> = T;

pub trait OverlaySize {
    type Inputs: Copy + Clone;

    fn size(t: Self::Inputs) -> usize;
}

impl<S: Pod> OverlaySize for [S] {
    type Inputs = usize;

    fn size(t: Self::Inputs) -> usize {
        t
    }
}

pub trait FromSlice<T> {
    fn from_slice(data: &[T]) -> &Self;
}

pub trait FromMutSlice<T> {
    fn from_mut_slice(data: &mut [T]) -> &mut Self;
}
