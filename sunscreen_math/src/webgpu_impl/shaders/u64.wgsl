struct u64 {
    lo: u32,
    hi: u32
}

fn mul_wide(a: u32, b: u32) -> u64 {
    // Break a and b into 16-bit words.
    // Compute product as
    //     a b
    //   * c d
    // =======
    //     d*b
    //   d*a
    //   c*b
    // c*a
    //
    // Note that the low 16-bit words of d*a and c*b overlap the high word
    // of d*b. Similarly, the low 16-bit word of these overlaps c*a, so we
    // need to do shifting to align things properly.

    let a_lo = a & 0xFFFFu;
    let b_lo = b & 0xFFFFu;
    let a_hi = a >> 16u;
    let b_hi = b >> 16u;

    // The product of 2 16-bit words will fit in 32 bits
    let db = a_lo * b_lo;
    let ad = a_hi * b_lo;
    let cb = a_lo * b_hi;
    let ac = a_hi * b_hi;

    let ad_shift = ad << 16u;
    let cb_shift = cb << 16u;

    // When computing the sum of the low word components, carries can 
    // occur in each addition. A carry occurs in unsigned arithmetic
    // if sum < either operand.
    let dbad = db + ad_shift;
    var carry1 =  u32(dbad < db);
    let lo = dbad + cb_shift;
    var carry2 =  u32(lo < dbad);

    // For the high word, we add the carries.
    return u64(lo, ac + (ad >> 16u) + (cb >> 16u) + carry1 + carry2);
}

fn u64_add(a: u64, b: u64) -> u64 {
    let lo = a.lo + b.lo;
    let carry = u32(lo < a.lo);

    return u64(lo, a.hi + b.hi);
}