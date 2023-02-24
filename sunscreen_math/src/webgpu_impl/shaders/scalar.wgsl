struct Radix16 {
    v: array<i32, 64>
}

struct Scalar29 {
    v: array<u32, 9>
}

struct Foo {
    v: array<u32>
}

// WGSL is terrible in that you can't pass arrays of unknown length to functions. So, we create
// functions for unpacking bindings a, b respectively.
fn scalar29_unpack_a(grid_tid: u32, stride: u32) -> Scalar29 {
    let mask = (1u << 29u) - 1u;
    let top_mask = (1u << 24u) - 1u;
    var s = Scalar29_Zero;

    s.v[0] =   g_a[0u * stride + grid_tid]                                                 & mask;
    s.v[1] = ((g_a[0u * stride + grid_tid] >> 29u) | (g_a[1u * stride + grid_tid] <<  3u)) & mask;
    s.v[2] = ((g_a[1u * stride + grid_tid] >> 26u) | (g_a[2u * stride + grid_tid] <<  6u)) & mask;
    s.v[3] = ((g_a[2u * stride + grid_tid] >> 23u) | (g_a[3u * stride + grid_tid] <<  9u)) & mask;
    s.v[4] = ((g_a[3u * stride + grid_tid] >> 20u) | (g_a[4u * stride + grid_tid] << 12u)) & mask;
    s.v[5] = ((g_a[4u * stride + grid_tid] >> 17u) | (g_a[5u * stride + grid_tid] << 15u)) & mask;
    s.v[6] = ((g_a[5u * stride + grid_tid] >> 14u) | (g_a[6u * stride + grid_tid] << 18u)) & mask;
    s.v[7] = ((g_a[6u * stride + grid_tid] >> 11u) | (g_a[7u * stride + grid_tid] << 21u)) & mask;
    s.v[8] =  (g_a[7u * stride + grid_tid] >>  8u)                                         & top_mask;

    return s;
}

fn scalar29_unpack_b(grid_tid: u32, stride: u32) -> Scalar29 {
    let mask = (1u << 29u) - 1u;
    let top_mask = (1u << 24u) - 1u;
    var s = Scalar29_Zero;

    s.v[0] =   g_b[0u * stride + grid_tid]                                                 & mask;
    s.v[1] = ((g_b[0u * stride + grid_tid] >> 29u) | (g_b[1u * stride + grid_tid] <<  3u)) & mask;
    s.v[2] = ((g_b[1u * stride + grid_tid] >> 26u) | (g_b[2u * stride + grid_tid] <<  6u)) & mask;
    s.v[3] = ((g_b[2u * stride + grid_tid] >> 23u) | (g_b[3u * stride + grid_tid] <<  9u)) & mask;
    s.v[4] = ((g_b[3u * stride + grid_tid] >> 20u) | (g_b[4u * stride + grid_tid] << 12u)) & mask;
    s.v[5] = ((g_b[4u * stride + grid_tid] >> 17u) | (g_b[5u * stride + grid_tid] << 15u)) & mask;
    s.v[6] = ((g_b[5u * stride + grid_tid] >> 14u) | (g_b[6u * stride + grid_tid] << 18u)) & mask;
    s.v[7] = ((g_b[6u * stride + grid_tid] >> 11u) | (g_b[7u * stride + grid_tid] << 21u)) & mask;
    s.v[8] =  (g_b[7u * stride + grid_tid] >>  8u)                                         & top_mask;

    return s;
}

fn scalar29_pack_c(val: Scalar29, grid_tid: u32, stride: u32) {
    var word: u32 = val.v[0u] | val.v[1u] << 29u;

    g_c[0u * stride + grid_tid] = word;
    word = val.v[1] >> 3u | val.v[2u] << 26u;
    g_c[1u * stride + grid_tid] = word;
    word = val.v[2] >> 6u | val.v[3u] << 23u;
    g_c[2u * stride + grid_tid] = word;
    word = val.v[3] >> 9u | val.v[4u] << 20u;
    g_c[3u * stride + grid_tid] = word;
    word = val.v[4] >> 12u | val.v[5u] << 17u;
    g_c[4u * stride + grid_tid] = word;
    word = val.v[5] >> 15u | val.v[6u] << 14u;
    g_c[5u * stride + grid_tid] = word;
    word = val.v[6] >> 18u | val.v[7u] << 11u;
    g_c[6u * stride + grid_tid] = word;
    word = val.v[7] >> 21u | val.v[8u] << 8u;
    g_c[7u * stride + grid_tid] = word;
}

/*
fn scalar29_add(a: ptr<function, Scalar29>, b: ptr<function, Scalar29>) -> Scalar29 {
    var sum = Scalar29_Zero;
    let mask = (0x1u << 29u) - 1u;

    // a + b
    var carry = 0u;
    for (var i = 0u; i < 9u; i++) {
        carry = (*a).v[i] + (*b).v[i] + (carry >> 29u);
        sum.v[i] = carry & mask;
    }

    // subtract l if the sum is >= l
    return scalar29_sub(&sum, Scalar29_L);
}*/

fn scalar29_sub(a: ptr<function, Scalar29>, b: ptr<function, Scalar29>) -> Scalar29 {
    var difference = Scalar29_Zero;
    let mask = (1u << 29u) - 1u;

    // a - b
    var borrow = 0u;
    for (var i = 0u; i < 9u; i++) {
        borrow = (*a).v[i] - ((*b).v[i] + (borrow >> 31u));
        difference.v[i] = borrow & mask;
    }

    // conditionally add l if the difference is negative
    let underflow_mask = ((borrow >> 31u) ^ 1u) - 1u;

    var carry = 0u;
    for (var i = 0u; i < 9u; i++) {
        carry = (carry >> 29u) + difference.v[i] + (Scalar29_L.v[i] & underflow_mask);
        difference.v[i] = carry & mask;
    }

    return difference;
}