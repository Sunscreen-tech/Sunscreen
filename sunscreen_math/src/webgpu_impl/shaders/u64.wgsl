struct u64 {
    lo: u32,
    hi: u32
}

fn wide_mul(a: u32, b: u32) -> u64 {
    let a_lo = a & 0xFFFFu;
    let b_lo = b & 0xFFFFu;
    let a_hi = a >> 16u;
    let b_hi = b >> 16u;

    let db = a_lo * b_lo;
    let ad = a_hi * b_lo;
    let cb = a_lo * b_hi;
    let ac = a_hi * b_hi;

    let ad_shift = ad << 16u;
    let cb_shift = cb << 16u;

    let dbad = db + ad_shift;
    var carry1 =  u32(dbad < max(db, ad_shift));
    let lo = dbad + cb_shift;
    var carry2 =  u32(lo < max(dbad, cb_shift));

    return u64(lo, ac + (ad >> 16u) + (cb >> 16u) + carry1 + carry2);
}