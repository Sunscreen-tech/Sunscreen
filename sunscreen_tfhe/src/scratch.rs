use linked_list::{Cursor, LinkedList};
use num::{Complex, Float};
use rustfft::FftNum;
use std::{
    alloc::Layout,
    cell::RefCell,
    marker::PhantomData,
    mem::{size_of, transmute},
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
struct Scratch {
    // Only accessed through the cursor, so compiler thinks it's unused.
    #[allow(unused)]
    stack: Box<LinkedList<Allocation>>,
    top: *mut Cursor<'static, Allocation>,
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let top = unsafe { Box::from_raw(self.top) };

        std::mem::drop(top);
    }
}

impl Scratch {
    /// We require this to be private. [`allocate_scratch`] should be
    /// the only way to use scratch memory, which will allocate memory
    /// using a thread_local allocator.
    fn new() -> Self {
        let mut list = Box::new(LinkedList::new());

        let cursor = Box::new(list.cursor());
        let top = unsafe { transmute(Box::into_raw(cursor)) };

        Self { stack: list, top }
    }

    /// Allocate a buffer matching the given specification.
    fn allocate<T>(&mut self, count: usize) -> ScratchBuffer<'static, T>
    where
        T: Pod,
    {
        assert_ne!(size_of::<T>(), 0);

        let top = unsafe { &mut *self.top };

        // Push the top as far down until we hit the bottom or an allocation
        // currently in use.
        loop {
            let prev = top.peek_prev();

            if let Some(x) = prev {
                if x.is_free {
                    top.prev().unwrap();
                    continue;
                }
            }

            break;
        }

        let layout = Layout::array::<T>(count).unwrap();
        let req_len = layout.size() + layout.align();

        let allocation = match top.peek_next() {
            Some(d) => {
                assert!(d.is_free);

                // Resize the allocation if needed.
                if d.data.len() < req_len {
                    d.data.resize(req_len, 0u8);
                }

                d.requested_len = count;
                top.next().unwrap()
            }
            None => {
                let data = vec![0u8; req_len];

                let allocation = Allocation {
                    requested_len: count,
                    is_free: false,
                    data,
                };

                top.insert(allocation);
                top.next().unwrap()
            }
        };

        allocation.is_free = false;

        ScratchBuffer {
            allocation: allocation as *mut Allocation,
            _phantom: PhantomData,
        }
    }
}

struct Allocation {
    requested_len: usize,
    data: Vec<u8>,
    is_free: bool,
}

pub struct ScratchBuffer<'a, T> {
    allocation: *mut Allocation,
    _phantom: PhantomData<&'a T>,
}

impl<'a, T> ScratchBuffer<'a, T> {
    #[allow(unused)]
    /// Get a slice to the underlying data.
    ///
    /// # Remarks
    /// While not extremely expensive, this operation does require capturing
    /// an aligned slice of data in an underlying allocation.  As such,
    /// you should avoid repeated calls.
    pub fn as_slice(&self) -> &[T] {
        let count = unsafe { (*self.allocation).requested_len };
        let (_, slice, _) = unsafe { (*self.allocation).data.align_to::<T>() };
        unsafe { transmute(&slice[0..count]) }
    }

    /// Get a mutable slice to the underlying data.
    ///
    /// # Remarks
    /// While not extremely expensive, this operation does require capturing
    /// an aligned slice of data in an underlying allocation.  As such,
    /// you should avoid repeated calls.
    pub fn as_mut_slice(&mut self) -> &mut [T] {
        let count = unsafe { (*self.allocation).requested_len };
        let (_pre, slice, _post) = unsafe { (*self.allocation).data.align_to_mut::<T>() };
        unsafe { transmute(&mut slice[0..count]) }
    }
}

impl<'a, T> Drop for ScratchBuffer<'a, T> {
    fn drop(&mut self) {
        unsafe { (*self.allocation).is_free = true };
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

        assert_eq!(scratch.stack.len(), 1);
    }

    #[test]
    fn buffers_get_reused() {
        let mut scratch = Scratch::new();

        let b = scratch.allocate::<u64>(64);

        assert_eq!(scratch.stack.len(), 1);
        let b_slice = b.as_slice();
        assert_eq!(b_slice.len(), 64);
        assert_eq!(b_slice.as_ptr().align_offset(align_of::<u64>()), 0);
        let first_ptr = b_slice.as_ptr();

        std::mem::drop(b);

        let mut b = scratch.allocate::<u64>(64);
        let b_slice = b.as_mut_slice();
        assert_eq!(first_ptr, b_slice.as_ptr());
        assert_eq!(scratch.stack.len(), 1);
        assert_eq!(b_slice.len(), 64);

        for (i, b_i) in b_slice.iter_mut().enumerate() {
            *b_i = i as u64;
        }
    }

    #[test]
    fn reallocate_on_bigger_request() {
        let mut scratch = Scratch::new();

        let mut b = scratch.allocate::<u64>(64);

        assert_eq!(scratch.stack.len(), 1);
        let b_slice = b.as_mut_slice();
        assert_eq!(b_slice.len(), 64);
        assert_eq!(b_slice.as_ptr().align_offset(align_of::<u64>()), 0);
        let first_ptr = b_slice.as_ptr();

        for (i, b_i) in b_slice.iter_mut().enumerate() {
            *b_i = i as u64;
        }

        std::mem::drop(b);

        let mut b = scratch.allocate::<u64>(16384);
        let b = b.as_mut_slice();
        assert_ne!(first_ptr, b.as_ptr());
        assert_eq!(scratch.stack.len(), 1);
        assert_eq!(b.len(), 16384);

        for (i, b_i) in b.iter_mut().enumerate() {
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
        assert_eq!(scratch.stack.len(), 2);
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

        assert_eq!(scratch.stack.len(), 10);

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
        #[derive(Copy, Clone)]
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
    fn stack_coalesces_correctly() {
        let mut scratch = Scratch::new();
        let a = scratch.allocate::<u64>(16);
        let mut b: ScratchBuffer<'_, u64> = scratch.allocate::<u64>(16);
        let b_ptr = b.as_mut_slice().as_mut_ptr();

        let c: ScratchBuffer<'_, u64> = scratch.allocate::<u64>(16);
        let d: ScratchBuffer<'_, u64> = scratch.allocate::<u64>(16);

        std::mem::drop(b);
        assert_eq!(scratch.stack.len(), 4);

        // We can't reuse b's buffer until c, d, e get dropped.
        let mut e: ScratchBuffer<'_, u64> = scratch.allocate::<u64>(16);
        assert_ne!(b_ptr, e.as_mut_slice().as_mut_ptr());

        assert_eq!(scratch.stack.len(), 5);

        std::mem::drop(c);
        std::mem::drop(d);
        std::mem::drop(e);

        // Now we can reuse b's buffer.
        let mut f = scratch.allocate::<u64>(16);
        assert_eq!(f.as_mut_slice().as_mut_ptr(), b_ptr);
        assert_eq!(scratch.stack.len(), 5);

        std::mem::drop(a);
    }

    #[test]
    fn zero_size_allocations() {
        let mut scratch = Scratch::new();
        let a = scratch.allocate::<u64>(2);
        let b = scratch.allocate::<u64>(0);

        let a_slice = a.as_slice();
        let b_slice = b.as_slice();

        assert_eq!(scratch.stack.len(), 2);
        assert_eq!(a_slice.len(), 2);
        assert_eq!(b_slice.len(), 0);
    }

    #[test]
    #[should_panic]
    fn zst_allocations_should_panic() {
        struct Foo {}
        unsafe impl Pod for Foo {}

        let mut scratch = Scratch::new();
        let _ = scratch.allocate::<Foo>(0x1 << 48);
    }
}
