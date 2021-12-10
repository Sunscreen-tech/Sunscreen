use crate::{FheType};
use seal::{Ciphertext, RelinearizationKeys, GaloisKeys, PublicKey};


/**
 * Creates and validates arguments to be passed to a circuit.
 */
pub struct Arguments {
    pub(crate) args: Vec<Box<dyn FheType>>,
}

impl Arguments {
    /**
     * Construct a new [`Arguments`] object.
     */
    pub fn new() -> Self {
        Self {
            args: vec![]
        }
    }

    /**
     * Add an argument to the [`Arguments`] object. Arguments are passed in the order
     * calls to this function are made.
     */
    pub fn arg<T: 'static + FheType>(mut self, a: T) -> Self {
        self.args.push(Box::new(a));

        self
    }
}

/**
 * The set of all information needed to run a circuit.
 */
pub struct InputBundle {
    pub(crate) ciphertexts: Vec<Ciphertext>,
    pub(crate) galois_keys: Option<GaloisKeys>,
    pub(crate) relin_keys: Option<RelinearizationKeys>,
    pub(crate) public_keys: Option<PublicKey>,
}