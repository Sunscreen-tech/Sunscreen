use aligned_vec::{avec_rt, AVec, RuntimeAlign};
use num::{Complex, Float};
use rustfft::FftNum;
use std::{
    cell::RefCell,
    collections::LinkedList,
    marker::PhantomData,
    mem::{align_of, size_of}, rc::Rc,
};

use crate::{Torus, TorusOps};

thread_local! {
    static SCRATCH: RefCell<Option<Scratch>> = RefCell::new(None);
}

macro_rules! allocate_scratch_ref {
    ($out_ident:ident,$ref_t:ident<$t_arg:ty>, ($($args:expr),*)) => {
        let mut tmp = crate::scratch::allocate_scratch(<$ref_t<$t_arg> as crate::dst::OverlaySize>::size(($($args),*)));
        let $out_ident = <$ref_t<$t_arg>>::from_mut_slice(tmp.as_mut_slice());
    };
    ($out_ident:ident,[$ref_t:ident<$t_arg:ty>], $len:expr) => {
        let mut tmp = crate::scratch::allocate_scratch::<$ref_t<$t_arg>>(<[$ref_t<$t_arg>] as crate::dst::OverlaySize>::size($len));
        let $out_ident = tmp.as_mut_slice();
    }
}

pub(crate) use allocate_scratch_ref;

#[cfg(target_feature = "neon")]
pub const SIMD_ALIGN: usize = align_of::<std::arch::aarch64::float64x2_t>();

#[cfg(target_arch = "x86_64")]
pub const SIMD_ALIGN: usize = align_of::<std::arch::x86_64::__m512d>();

#[cfg(not(any(target_feature = "neon", target_arch = "x86_64")))]
pub const SIMD_ALIGN: usize = align_of::<u128>();

/// Indicates this is a "Plain Old Data" type. For `T` qualify as such,
/// all bit patterns must be considered a properly initialized instance of
/// `T`.
///
/// # Safety
/// Implementing this trait on types that don't meet the above requirements
/// may result in undefined behavior.
pub unsafe trait Pod {}

unsafe impl Pod for u8 {}
unsafe impl Pod for u16 {}
unsafe impl Pod for u32 {}
unsafe impl Pod for u64 {}
unsafe impl Pod for u128 {}
unsafe impl Pod for i8 {}
unsafe impl Pod for i16 {}
unsafe impl Pod for i32 {}
unsafe impl Pod for i64 {}
unsafe impl Pod for i128 {}
unsafe impl Pod for f32 {}
unsafe impl Pod for f64 {}
unsafe impl<T> Pod for Complex<T> where T: Float + FftNum {}
unsafe impl<S> Pod for Torus<S> where S: TorusOps {}

/// Allocate a scratch buffer in a cache efficient manner. Freed scratch
/// buffers are reused in subsequent allocations.
///
/// # Remarks
/// The returned [`ScratchBuffer`] will be aligned to `align_of::<T>()` and
/// have a length equal to count.
///
/// # Panics
/// If `T` is a zero-sized type (e.g. `()`).
pub fn allocate_scratch<T>(count: usize) -> ScratchBuffer<'static, T>
where
    T: Pod,
{
    SCRATCH.with(|s| {
        if s.borrow().is_none() {
            let new_scratch = Scratch::new();
            *s.borrow_mut() = Some(new_scratch);
        }

        (*s.borrow_mut()).as_mut().unwrap().allocate::<T>(count)
    })
}

/// An "allocator" designed for allocating scratch memory.
///
/// # Remarks
/// Internally, this data structure is a [`LinkedList`] of
/// [`Vec`]s treated as a stack.
///
/// [`Scratch`] is designed to provide a cache locality for
/// temporary buffers by reusing allocations.
///
/// Upon allocation, we update the "top" of the stack to be the
/// furthest consecutive free buffer from the actual top.
///
/// The only way to use this type is through the `thread_local`
/// singleton, as this is the only way to guarantee soundness.
/// The references doled out by allocate have `'static``
/// lifetimes. This is needed so you can have mutable references
/// to different allocations at the same time.
///
/// # Safety
/// [`Scratch`] must not drop before all its outstanding allocations have done so.
///
/// Please note the lack of [`Sync`] and [`Send`] on this object. It is not sound to
/// share these between threads.
struct Scratch {
    stack: Rc<RefCell<LinkedList<*mut Allocation>>>,
}

impl Scratch {
    /// We require this to be private. [`allocate_scratch`] should be
    /// the only way to use scratch memory, which will allocate memory
    /// using a thread_local allocator.
    fn new() -> Self {
        Self { stack: Rc::new(RefCell::new(LinkedList::new())) }
    }

    /// Allocate a buffer matching the given specification.
    fn allocate<T>(&mut self, count: usize) -> ScratchBuffer<'static, T>
    where
        T: Pod,
    {
        assert_ne!(size_of::<T>(), 0);

        let alignment = usize::max(SIMD_ALIGN, align_of::<T>());
        let u8_len = count * size_of::<T>();

        let allocation = unsafe {
            let allocation = self.stack.borrow_mut().pop_back();

            if allocation.is_none() {
                // If we don't have an existing allocation, make one
                let allocation = Allocation {
                    data: avec_rt!([alignment]| u8::default(); u8_len),
                };

                let allocation = Box::new(allocation);
                Box::into_raw(allocation)
            } else if (*allocation.unwrap()).data.alignment() < alignment
                || (*allocation.unwrap()).data.len() < u8_len
            {
                // If we found an allocation, but its size and len requirements
                // are insufficient.
                let allocation = allocation.unwrap();
                let drop_box = Box::from_raw(allocation);
                std::mem::drop(drop_box);

                let allocation = Allocation {
                    data: avec_rt!([alignment]| u8::default(); u8_len),
                };

                let allocation = Box::new(allocation);
                Box::into_raw(allocation)
            } else {
                // Otherwise, reuse the allocation.
                allocation.unwrap()
            }
        };

        ScratchBuffer {
            allocation,
            pool: self.stack.clone(),
            requested_len: count,
            _phantom: PhantomData,
        }
    }
}

struct Allocation {
    data: AVec<u8, RuntimeAlign>,
}

/// An allocation returned by [`Scratch::allocate`].
///
/// # Safety
/// Please note the lack of [`Sync`] and [`Send`] on this object. It is not sound to
/// share these between threads.
///
/// You *may* however share the slice returned by [`Self::as_slice`] or
/// [`Self::as_mut_slice`], as these obey standard lifetime rules.
pub struct ScratchBuffer<'a, T> {
    allocation: *mut Allocation,
    pool: Rc<RefCell<LinkedList<*mut Allocation>>>,
    requested_len: usize,
    _phantom: PhantomData<&'a T>,
}

impl<'a, T> ScratchBuffer<'a, T> {
    #[allow(unused)]
    /// Get a slice to the underlying data.

    pub fn as_slice(&self) -> &[T] {
        let slice =
            unsafe { std::mem::transmute::<&[u8], &[T]>((*self.allocation).data.as_slice()) };

        &slice[0..self.requested_len]
    }

    /// Get a mutable slice to the underlying data.
    pub fn as_mut_slice(&mut self) -> &mut [T] {
        let slice = unsafe {
            std::mem::transmute::<&mut [u8], &mut [T]>((*self.allocation).data.as_mut_slice())
        };

        &mut slice[0..self.requested_len]
    }
}

impl<'a, T> Drop for ScratchBuffer<'a, T> {
    fn drop(&mut self) {
        self.pool.borrow_mut().push_back(self.allocation);
    }
}

#[cfg(test)]
mod tests {
    use std::mem::align_of;

    use super::*;

    #[test]
    fn can_allocate() {
        let mut scratch = Scratch::new();

        let mut d = scratch.allocate::<u64>(64);

        let d = d.as_mut_slice();
        assert_eq!(d.len(), 64);

        for (i, d_i) in d.iter_mut().enumerate() {
            *d_i = i as u64;
        }
    }

    #[test]
    fn buffers_get_reused() {
        let mut scratch = Scratch::new();

        let b = scratch.allocate::<u64>(64);

        let b_slice = b.as_slice();
        assert_eq!(b_slice.len(), 64);
        assert_eq!(b_slice.as_ptr().align_offset(align_of::<u64>()), 0);
        let first_ptr = b_slice.as_ptr();

        std::mem::drop(b);

        let mut b = scratch.allocate::<u64>(64);
        let b_slice = b.as_mut_slice();
        assert_eq!(first_ptr, b_slice.as_ptr());
        assert_eq!(b_slice.len(), 64);

        for (i, b_i) in b_slice.iter_mut().enumerate() {
            *b_i = i as u64;
        }
    }

    #[test]
    fn allocate_two_buffers() {
        let mut scratch = Scratch::new();

        let mut a = scratch.allocate::<u64>(12);
        let mut b = scratch.allocate::<u64>(12);

        let a = a.as_mut_slice();
        let b = b.as_mut_slice();

        assert_eq!(a.len(), 12);
        assert_eq!(b.len(), 12);
        assert_ne!(a.as_mut_ptr(), b.as_mut_ptr());

        for i in 0..a.len() {
            a[i] = i as u64;
            b[i] = i as u64;
        }
    }

    #[test]
    fn align_16() {
        let mut scratch = Scratch::new();
        let mut buffers = (0..10)
            .map(|_| scratch.allocate::<u128>(10))
            .collect::<Vec<_>>();

        for b in buffers.iter_mut() {
            let b = b.as_mut_slice();
            assert_eq!(b.len(), 10);

            for (i, b_i) in b.iter_mut().enumerate() {
                *b_i = i as u128;
            }
        }
    }

    #[test]
    fn align_65536() {
        // Chose an alignment larger than any reasonable OS's page size
        // to try to force the alignment algorithm into play.
        #[repr(C, align(65536))]
        #[derive(Copy, Clone, Default)]
        struct Foo {
            x: u32,
        }

        unsafe impl Pod for Foo {}

        let mut scratch = Scratch::new();
        let mut b = scratch.allocate::<Foo>(15);

        let b_slice = b.as_mut_slice();
        assert_eq!(b_slice.len(), 15);

        for b in b_slice {
            b.x = 22;
            let ptr = b as *mut Foo;

            // Check that each item is memory aligned to the proper
            // location.
            assert_eq!(ptr.align_offset(align_of::<Foo>()), 0);
        }
    }

    #[test]
    fn zero_size_allocations() {
        let mut scratch = Scratch::new();
        let a = scratch.allocate::<u64>(2);
        let b = scratch.allocate::<u64>(0);

        let a_slice = a.as_slice();
        let b_slice = b.as_slice();

        assert_eq!(a_slice.len(), 2);
        assert_eq!(b_slice.len(), 0);
    }

    #[test]
    #[should_panic]
    fn zst_allocations_should_panic() {
        #[derive(Default)]
        struct Foo {}
        unsafe impl Pod for Foo {}

        let mut scratch = Scratch::new();
        let _ = scratch.allocate::<Foo>(0x1 << 48);
    }

    #[test]
    fn simd_alignment() {
        #[cfg(target_arch = "aarch64")]
        {
            assert_eq!(SIMD_ALIGN, 16);
        }

        #[cfg(target_arch = "x86_64")]
        {
            assert_eq!(SIMD_ALIGN, 64);
        }
    }
}
