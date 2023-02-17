use curve25519_dalek::ristretto::RistrettoPoint;
use digest::{core_api::XofReaderCoreWrapper, XofReader};
use rayon::prelude::*;
use sha3::{
    digest::{ExtendableOutput, Update},
    Shake256, Shake256ReaderCore,
};

#[derive(Clone)]
/**
 * A stream of random ristretto points seeded from a given label.
 */
struct GeneratorChain {
    reader: XofReaderCoreWrapper<Shake256ReaderCore>,
}

impl GeneratorChain {
    pub fn new(label: &[u8]) -> Self {
        let mut digest = Shake256::default();
        digest.update(b"Generator");
        digest.update(label);

        Self {
            reader: digest.finalize_xof(),
        }
    }
}

impl Iterator for GeneratorChain {
    type Item = RistrettoPoint;

    fn next(&mut self) -> Option<Self::Item> {
        let mut uniform_bytes = [0u8; 64];
        self.reader.read(&mut uniform_bytes);

        Some(RistrettoPoint::from_uniform_bytes(&uniform_bytes))
    }

    fn size_hint(&self) -> (usize, Option<usize>) {
        (usize::max_value(), None)
    }
}

/**
 * The generator vectors used in creating and challenging vector commitments
 * in the [`crate::LogProof`] and [`crate::InnerProductProof`].
 */
pub struct LogProofGenerators {
    /**
     * The generators named `g` in the [`LogProof`](crate::LogProof)
     * and [`InnerProductProof`](crate::InnerProductProof).
     */
    pub g: Vec<RistrettoPoint>,

    /**
     * The generators named `h` in the [`LogProof`](crate::LogProof)
     * and [`InnerProductProof`](crate::InnerProductProof).
     */
    pub h: Vec<RistrettoPoint>,
}

impl LogProofGenerators {
    /**
     * Create a vector of `n` psuedorandom [`RistrettoPoint`] points.
     *
     * # Remarks
     * The points generated are deterministic for a given `label`.
     *
     * When generating `m` > `n` points first `n` points will be the same
     * as when generating `n` points.
     */
    pub fn new(n: usize) -> Self {
        // We parallelize generator creation, which adds some annoying
        // complexity. Basically, create n/8192 sets of PRNGs labeled i from
        // a SHA3 hash of {label}{i}. Each batch produces 8192 values. We
        // then concatenate the batches.
        //
        // Rayon assures the order of traversal in a parallel iterator is the
        // same as a serial one, so we don't need to reorder our batches.
        fn get_points(label: &str, n: usize) -> Vec<RistrettoPoint> {
            let mut g = vec![];

            (0..n)
                .into_par_iter()
                .chunks(8192)
                .map(|x| {
                    let label = format!("{label}{}", x[0]);

                    GeneratorChain::new(label.as_bytes())
                        .take(x.len())
                        .collect::<Vec<RistrettoPoint>>()
                })
                .collect_into_vec(&mut g);

            g.into_iter()
                .map(|x| x)
                .take(n)
                .collect::<Vec<Vec<RistrettoPoint>>>()
                .concat()
        }

        Self {
            g: get_points("g", n),
            h: get_points("h", n),
        }
    }
}
