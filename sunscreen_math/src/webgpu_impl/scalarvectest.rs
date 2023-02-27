use std::ops::{Index, IndexMut};

pub struct Scalar29(pub [u32; 9]);

impl Index<usize> for Scalar29 {
    type Output = u32;
    fn index(&self, _index: usize) -> &u32 {
        &(self.0[_index])
    }
}

impl IndexMut<usize> for Scalar29 {
    fn index_mut(&mut self, _index: usize) -> &mut u32 {
        &mut (self.0[_index])
    }
}

impl Scalar29 {
    /// Return the zero scalar.
    pub fn zero() -> Scalar29 {
        Scalar29([0,0,0,0,0,0,0,0,0])
    }

    /// Unpack a 32 byte / 256 bit scalar into 9 29-bit limbs.
    pub fn from_bytes(bytes: &[u8; 32]) -> Scalar29 {
        let mut words = [0u32; 8];
        for i in 0..8 {
            for j in 0..4 {
                words[i] |= (bytes[(i * 4) + j] as u32) << (j * 8);
            }
        }

        let mask = (1u32 << 29) - 1;
        let top_mask = (1u32 << 24) - 1;
        let mut s = Scalar29::zero();

        s[ 0] =   words[0]                            & mask;
        s[ 1] = ((words[0] >> 29) | (words[1] <<  3)) & mask;
        s[ 2] = ((words[1] >> 26) | (words[2] <<  6)) & mask;
        s[ 3] = ((words[2] >> 23) | (words[3] <<  9)) & mask;
        s[ 4] = ((words[3] >> 20) | (words[4] << 12)) & mask;
        s[ 5] = ((words[4] >> 17) | (words[5] << 15)) & mask;
        s[ 6] = ((words[5] >> 14) | (words[6] << 18)) & mask;
        s[ 7] = ((words[6] >> 11) | (words[7] << 21)) & mask;
        s[ 8] =  (words[7] >>  8)                     & top_mask;

        s
    }
}

fn m(x: u32, y: u32) -> u64 {
    (x as u64) * (y as u64)
}

pub (crate) fn mul_internal(a: &Scalar29, b: &Scalar29) -> [u64; 17] {
    let mut z = [0u64; 17];

    z[0] = m(a[0],b[0]);                                                             // c00
    z[1] = m(a[0],b[1]) + m(a[1],b[0]);                                              // c01
    z[2] = m(a[0],b[2]) + m(a[1],b[1]) + m(a[2],b[0]);                               // c02
    z[3] = m(a[0],b[3]) + m(a[1],b[2]) + m(a[2],b[1]) + m(a[3],b[0]);                // c03
    z[4] = m(a[0],b[4]) + m(a[1],b[3]) + m(a[2],b[2]) + m(a[3],b[1]) + m(a[4],b[0]); // c04
    z[5] =                m(a[1],b[4]) + m(a[2],b[3]) + m(a[3],b[2]) + m(a[4],b[1]); // c05
    z[6] =                               m(a[2],b[4]) + m(a[3],b[3]) + m(a[4],b[2]); // c06
    z[7] =                                              m(a[3],b[4]) + m(a[4],b[3]); // c07
    z[8] =                                                            (m(a[4],b[4])).wrapping_sub(z[3]); // c08 - c03

    z[10] = z[5].wrapping_sub(m(a[5],b[5]));                                             // c05mc10
    z[11] = z[6].wrapping_sub(m(a[5],b[6]) + m(a[6],b[5]));                              // c06mc11
    z[12] = z[7].wrapping_sub(m(a[5],b[7]) + m(a[6],b[6]) + m(a[7],b[5]));               // c07mc12
    z[13] =                   m(a[5],b[8]) + m(a[6],b[7]) + m(a[7],b[6]) + m(a[8],b[5]); // c13
    z[14] =                                  m(a[6],b[8]) + m(a[7],b[7]) + m(a[8],b[6]); // c14
    z[15] =                                                 m(a[7],b[8]) + m(a[8],b[7]); // c15
    z[16] =                                                                m(a[8],b[8]); // c16

    z[ 5] = z[10].wrapping_sub(z[ 0]); // c05mc10 - c00
    z[ 6] = z[11].wrapping_sub(z[ 1]); // c06mc11 - c01
    z[ 7] = z[12].wrapping_sub(z[ 2]); // c07mc12 - c02
    z[ 8] = z[ 8].wrapping_sub(z[13]); // c08mc13 - c03
    z[ 9] = z[14].wrapping_add(z[ 4]); // c14 + c04
    z[10] = z[15].wrapping_add(z[10]); // c15 + c05mc10
    z[11] = z[16].wrapping_add(z[11]); // c16 + c06mc11

    let aa = [
        a[0]+a[5],
        a[1]+a[6],
        a[2]+a[7],
        a[3]+a[8]
    ];

    let bb = [
        b[0]+b[5],
        b[1]+b[6],
        b[2]+b[7],
        b[3]+b[8]
    ];

    z[ 5] = (m(aa[0],bb[0]))                                                                   .wrapping_add(z[ 5]); // c20 + c05mc10 - c00
    z[ 6] = (m(aa[0],bb[1]) + m(aa[1],bb[0]))                                                  .wrapping_add(z[ 6]); // c21 + c06mc11 - c01
    z[ 7] = (m(aa[0],bb[2]) + m(aa[1],bb[1]) + m(aa[2],bb[0]))                                 .wrapping_add(z[ 7]); // c22 + c07mc12 - c02
    z[ 8] = (m(aa[0],bb[3]) + m(aa[1],bb[2]) + m(aa[2],bb[1]) + m(aa[3],bb[0]))                .wrapping_add(z[ 8]); // c23 + c08mc13 - c03
    z[ 9] = (m(aa[0], b[4]) + m(aa[1],bb[3]) + m(aa[2],bb[2]) + m(aa[3],bb[1]) + m(a[4],bb[0])).wrapping_sub(z[ 9]); // c24 - c14 - c04
    z[10] = (                 m(aa[1], b[4]) + m(aa[2],bb[3]) + m(aa[3],bb[2]) + m(a[4],bb[1])).wrapping_sub(z[10]); // c25 - c15 - c05mc10
    z[11] = (                                  m(aa[2], b[4]) + m(aa[3],bb[3]) + m(a[4],bb[2])).wrapping_sub(z[11]); // c26 - c16 - c06mc11
    z[12] = (                                                   m(aa[3], b[4]) + m(a[4],bb[3])).wrapping_sub(z[12]); // c27 - c07mc12

    z
}