use crate::scratch::Pod;

macro_rules! avec {
    ($elem:expr; $count:expr) => {
        aligned_vec::AVec::__from_elem(crate::scratch::SIMD_ALIGN, $elem, $count)
    };
}

macro_rules! avec_from_iter {
    ($iter:expr) => {
        aligned_vec::AVec::from_iter(crate::scratch::SIMD_ALIGN, $iter)
    };
}

macro_rules! avec_from_slice {
    ($slice:expr) => {
        aligned_vec::AVec::from_slice(crate::scratch::SIMD_ALIGN, $slice)
    }
}

macro_rules! dst {
    ($(#[$meta:meta])* $t:ty, $ref_t:ty, $wrapper:ty, ($($derive:ident),* $(,)? ), ($($t_bounds:ty),* $(,)? )) => {
        paste::paste! {

            $(#[$meta])*
            #[derive($($derive,)*)]
            pub struct $t<T> where T: Clone $(+ $t_bounds)* {
                data: aligned_vec::AVec<$wrapper<T>, aligned_vec::ConstAlign<{ crate::scratch::SIMD_ALIGN }>>
            }

            /// A reference to the data structure.
            #[repr(transparent)]
            pub struct $ref_t<T> where T: Clone $(+ $t_bounds)* {
                data: [$wrapper<T>],
            }

            impl<T> $ref_t<T> where T: Clone $(+ $t_bounds)* {
                #[allow(unused)]
                /// Clones the contents of rhs into self
                pub fn clone_from_ref(&mut self, rhs: &$ref_t<T>) {
                    for (l, r) in self.data.iter_mut().zip(rhs.data.iter()) {
                        *l = r.clone();
                    }
                }

                #[allow(unused)]
                /// Returns a slice view of the data representing a $t.
                pub fn as_slice(&self) -> &[$wrapper<T>] {
                    &self.data
                }

                #[allow(unused)]
                /// Returns a mutable slice view of the data representing a $t.
                pub fn as_mut_slice(&mut self) -> &mut [$wrapper<T>] {
                    &mut self.data
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
                #[allow(unused)]
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
                    $t { data: aligned_vec::AVec::from_slice(crate::scratch::SIMD_ALIGN, &self.data) }
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
    ($t:ty, $t_mut:ty, $par_t:ty, $par_t_mut:ty, $wrapper_type: ty, $item_ref:ty, ($($t_bounds:ty,)*)) => {
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
            }

            impl<'a, T> std::iter::ExactSizeIterator for $t<'a, T> where T: Clone $(+ $t_bounds)* {
                #[inline(always)]
                fn len(&self) -> usize {
                    self.data.len() / self.stride
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

            /// A parallel iterator over the underlying type
            pub struct $par_t<'a, T> where T: Send + Sync + Clone $(+ $t_bounds)* {
                data: &'a [$wrapper_type<T>],
                stride: usize,
                count: usize
            }

            impl<'a, T> $par_t<'a, T> where T: Send + Sync + Clone $(+ $t_bounds)* {
                #[inline(always)]
                #[allow(unused)]
                /// Create a new parallel iterator.
                pub fn new(data: &'a [$wrapper_type<T>], stride: usize) -> Self {
                    assert_eq!(data.len() % stride, 0);

                    let count = data.len() / stride;

                    Self {
                        data,
                        stride,
                        count
                    }
                }
            }

            impl<'a, T> rayon::iter::plumbing::Producer for $par_t<'a, T>
            where T: Send + Sync + Clone $(+ $t_bounds)* {
                type Item = &'a $item_ref<T>;
                type IntoIter = $t<'a, T>;

                #[inline(always)]
                fn split_at(self, index: usize) -> (Self, Self) {
                    let len = <Self as rayon::iter::IndexedParallelIterator>::len(&self);

                    let (left, right) = self.data.split_at(index * self.stride);

                    let left = Self {
                        data: left,
                        stride: self.stride,
                        count: index,
                    };

                    let right = Self {
                        data: right,
                        stride: self.stride,
                        count: len - index
                    };

                    (left, right)
                }

                #[inline(always)]
                fn into_iter(self) -> Self::IntoIter {
                    $t::new(self.data, self.stride)
                }
            }

            impl<'a, T> rayon::iter::ParallelIterator for $par_t<'a, T> where T: Send + Sync + Clone $(+ $t_bounds)* {
                type Item = &'a $item_ref<T>;

                fn drive_unindexed<C>(self, consumer: C) -> C::Result
                    where
                        C: rayon::iter::plumbing::UnindexedConsumer<Self::Item>,
                {
                    rayon::iter::plumbing::bridge(self, consumer)
                }
            }

            impl<'a, T> rayon::iter::IndexedParallelIterator for $par_t<'a, T> where
            T: Send + Sync + Clone $(+ $t_bounds)* {
                #[inline(always)]
                fn len(&self) -> usize {
                    self.count
                }

                fn drive<C>(self, consumer: C) -> C::Result
                    where C: rayon::iter::plumbing::Consumer<Self::Item>
                {
                    rayon::iter::plumbing::bridge(self, consumer)
                }

                fn with_producer<CB>(
                    self,
                    callback: CB
                ) -> CB::Output
                    where CB: rayon::iter::plumbing::ProducerCallback<Self::Item>
                {
                    callback.callback(self)
                }
            }

            /// A mutable iterator to access references to an underlying type.
            pub struct $t_mut<'a, T> where T: Clone $(+ $t_bounds)* {
                start: *mut $wrapper_type<T>,
                front: isize,
                back: isize,
                stride: usize,
                _phantom: std::marker::PhantomData<&'a T>
            }

            impl<'a, T> $t_mut<'a, T> where T: Clone $(+ $t_bounds)* {
                /// Create a new iterator that emits references to the contained type
                /// by striding over the underlying data, mutably.
                pub fn new(data: &'a mut [$wrapper_type<T>], stride: usize) -> Self {
                    assert_eq!(data.len() % stride, 0);

                    let len = (data.len() - stride) as isize;

                    Self {
                        start: data.as_mut_ptr(),
                        front: 0,
                        back: len,
                        stride,
                        _phantom: std::marker::PhantomData
                    }
                }
            }

            impl<'a, T> std::iter::Iterator for $t_mut<'a, T> where T: Clone $(+ $t_bounds)* {
                type Item = &'a mut $item_ref<T>;

                fn next(&mut self) -> Option<Self::Item> {
                    if self.front > self.back {
                        return None;
                    }

                    let slice = unsafe {
                        let ptr = self.start.offset(self.front);
                        std::slice::from_raw_parts_mut(ptr, self.stride)
                    };

                    self.front += self.stride as isize;

                    Some(<$item_ref<T> as crate::dst::FromMutSlice<$wrapper_type<T>>>::from_mut_slice(slice))
                }
            }

            impl<'a, T> std::iter::ExactSizeIterator for $t_mut<'a, T> where T: Clone $(+ $t_bounds)* {
                #[inline(always)]
                fn len(&self) -> usize {
                    (self.back - self.front + self.stride as isize) as usize / self.stride
                }
            }

            impl<'a, T> std::iter::DoubleEndedIterator for $t_mut<'a, T> where T: Clone $(+ $t_bounds)* {
                fn next_back(&mut self) -> Option<Self::Item> {
                    if self.front > self.back {
                        return None;
                    }

                    let slice = unsafe {
                        let ptr = self.start.offset(self.back);
                        std::slice::from_raw_parts_mut(ptr, self.stride)
                    };

                    self.back -= self.stride as isize;

                    Some(<$item_ref<T> as crate::dst::FromMutSlice<$wrapper_type<T>>>::from_mut_slice(slice))
                }
            }

            /// A mutable parallel iterator over the underlying type
            pub struct $par_t_mut<'a, T> where T: Send + Sync + Clone $(+ $t_bounds)* {
                data: &'a mut [$wrapper_type<T>],
                stride: usize,
                count: usize
            }

            impl<'a, T> $par_t_mut<'a, T> where T: Send + Sync + Clone $(+ $t_bounds)* {
                #[inline(always)]
                #[allow(unused)]
                /// Create a new mutable parallel iterator.
                pub fn new(data: &'a mut [$wrapper_type<T>], stride: usize) -> Self {
                    assert_eq!(data.len() % stride, 0);

                    let count = data.len() / stride;

                    Self {
                        data,
                        stride,
                        count
                    }
                }
            }

            impl<'a, T> rayon::iter::plumbing::Producer for $par_t_mut<'a, T>
            where T: Send + Sync + Clone $(+ $t_bounds)* {
                type Item = &'a mut $item_ref<T>;
                type IntoIter = $t_mut<'a, T>;

                #[inline(always)]
                fn split_at(self, index: usize) -> (Self, Self) {
                    let len = <Self as rayon::iter::IndexedParallelIterator>::len(&self);

                    let (left, right) = self.data.split_at_mut(index * self.stride);

                    let left = Self {
                        data: left,
                        stride: self.stride,
                        count: index,
                    };

                    let right = Self {
                        data: right,
                        stride: self.stride,
                        count: len - index
                    };

                    (left, right)
                }

                #[inline(always)]
                fn into_iter(self) -> Self::IntoIter {
                    $t_mut::new(self.data, self.stride)
                }
            }

            impl<'a, T> rayon::iter::ParallelIterator for $par_t_mut<'a, T> where T: Send + Sync + Clone $(+ $t_bounds)* {
                type Item = &'a mut $item_ref<T>;

                fn drive_unindexed<C>(self, consumer: C) -> C::Result
                    where
                        C: rayon::iter::plumbing::UnindexedConsumer<Self::Item>,
                {
                    rayon::iter::plumbing::bridge(self, consumer)
                }
            }


            impl<'a, T> rayon::iter::IndexedParallelIterator for $par_t_mut<'a, T> where
            T: Send + Sync + Clone $(+ $t_bounds)* {
                #[inline(always)]
                fn len(&self) -> usize {
                    self.count
                }

                fn drive<C>(self, consumer: C) -> C::Result
                    where C: rayon::iter::plumbing::Consumer<Self::Item>
                {
                    rayon::iter::plumbing::bridge(self, consumer)
                }

                fn with_producer<CB>(
                    self,
                    callback: CB
                ) -> CB::Output
                    where CB: rayon::iter::plumbing::ProducerCallback<Self::Item>
                {
                    callback.callback(self)
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

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicUsize, Ordering};

    use rayon::iter::{IndexedParallelIterator, ParallelIterator};

    use super::*;

    dst! {
        Foo,
        FooRef,
        NoWrapper,
        (Clone, Debug),
        ()
    }

    dst_iter! { FooIter, FooIterMut, ParallelFooIter, ParallelFooIterMut, NoWrapper, FooRef, () }

    #[test]
    fn forward_iterate() {
        let data = (0..30).collect::<Vec<_>>();

        for (i, x) in FooIter::new(&data, 3).enumerate() {
            assert_eq!(x.as_slice()[0], 3 * i);
            assert_eq!(x.as_slice()[1], 3 * i + 1);
            assert_eq!(x.as_slice()[2], 3 * i + 2);
        }
    }

    #[test]
    fn reverse_iterate() {
        let data = (0..30).rev().collect::<Vec<_>>();

        for (i, x) in FooIter::new(&data, 3).rev().enumerate() {
            assert_eq!(x.as_slice()[0], 3 * i + 2);
            assert_eq!(x.as_slice()[1], 3 * i + 1);
            assert_eq!(x.as_slice()[2], 3 * i);
        }
    }

    #[test]
    #[should_panic]
    fn iter_stride_mismatch() {
        let data = (0..31).collect::<Vec<_>>();

        FooIter::new(&data, 3);
    }

    #[test]
    #[should_panic]
    fn iter_mut_stride_mismatch() {
        let mut data = (0..31).collect::<Vec<_>>();

        FooIterMut::new(&mut data, 3);
    }

    #[test]
    fn forward_iterate_mut() {
        let mut data = vec![0; 3 * 10];

        for (i, x) in FooIterMut::new(&mut data, 3).enumerate() {
            x.as_mut_slice()[0] = 3 * i;
            x.as_mut_slice()[1] = 3 * i + 1;
            x.as_mut_slice()[2] = 3 * i + 2;
        }

        let expected = (0..30).collect::<Vec<_>>();

        assert_eq!(data, expected);
    }

    #[test]
    fn reverse_iterate_mut() {
        let mut data = vec![0; 3 * 10];

        for (i, x) in FooIterMut::new(&mut data, 3).rev().enumerate() {
            x.as_mut_slice()[2] = 3 * i;
            x.as_mut_slice()[1] = 3 * i + 1;
            x.as_mut_slice()[0] = 3 * i + 2;
        }

        let expected = (0..30).rev().collect::<Vec<_>>();

        assert_eq!(data, expected);
    }

    #[test]
    fn parallel_iterate() {
        let data = (0..30).collect::<Vec<_>>();

        let items_iterated = AtomicUsize::new(0);

        ParallelFooIter::new(&data, 3)
            .enumerate()
            .for_each(|(i, x)| {
                assert_eq!(x.as_slice()[0], 3 * i);
                assert_eq!(x.as_slice()[1], 3 * i + 1);
                assert_eq!(x.as_slice()[2], 3 * i + 2);

                items_iterated.fetch_add(1, Ordering::Relaxed);
            });

        assert_eq!(items_iterated.load(Ordering::Relaxed), 10);
    }

    #[test]
    fn parallel_iterate_mut() {
        let mut data = vec![0; 30];

        ParallelFooIterMut::new(&mut data, 3)
            .enumerate()
            .for_each(|(i, x)| {
                x.as_mut_slice()[0] = 3 * i;
                x.as_mut_slice()[1] = 3 * i + 1;
                x.as_mut_slice()[2] = 3 * i + 2;
            });

        let expected = (0..30).collect::<Vec<_>>();

        assert_eq!(data, expected);
    }
}
