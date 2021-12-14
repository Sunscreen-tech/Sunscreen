use seal::SecurityLevel;
pub use semver::Version;
use serde::{
    de::{self, Visitor},
    Deserialize, Deserializer, Serialize, Serializer,
};
use sunscreen_circuit::{Circuit, SchemeType};

/**
 * A type which represents the fully qualified name and version of a datatype.
 */
#[derive(Debug, Clone, PartialEq)]
pub struct Type {
    /**
     * The fully qualified name of the type (including crate name)
     */
    pub name: String,

    /**
     * The semantic version of this type.
     */
    pub version: Version,
}

impl Serialize for Type {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let type_string = format!("{},{}", self.name, self.version);

        serializer.serialize_str(&type_string)
    }
}

struct TypeNameVisitor;

impl<'de> Visitor<'de> for TypeNameVisitor {
    type Value = String;

    fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(formatter, "A string of the form foo::bar::Baz,1.2.3")
    }

    fn visit_str<E>(self, s: &str) -> std::result::Result<Self::Value, E>
    where
        E: de::Error,
    {
        if s.split(",").count() != 2 {
            Err(de::Error::invalid_value(de::Unexpected::Str(s), &self))
        } else {
            Ok(s.to_owned())
        }
    }
}

impl<'de> Deserialize<'de> for Type {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let type_string = deserializer.deserialize_string(TypeNameVisitor)?;

        let mut splits = type_string.split(",");

        let typename = splits.next().unwrap();
        let version = Version::parse(splits.next().unwrap())
            .map_err(|e| de::Error::custom(format!("Failed to parse version: {}", e)))?;

        Ok(Self {
            name: typename.to_owned(),
            version,
        })
    }
}

/**
 * Indicates the type signatures of a circuit. Serves as a piece of the [`CircuitMetadata`].
 *
 * # Remarks
 * This type is serializable and circuit implementors can give this object
 * to consumers without revealing this circuit's implementation. This allows
 * users to encrypt their data in a verifiable manner.
 */
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CallSignature {
    /**
     * The type of each argument in the circuit.
     *
     * # Remarks
     * The ith argument to the circuit occupies the ith argument of the vector.
     * The length of this vector equals the number of arguments to the circuit.
     */
    pub arguments: Vec<Type>,

    /**
     * The type of the single return value of the circuit if the return type is
     * not a type. If the return type of the circuit is a tuple, then this contains
     * each type in the tuple.
     *
     * # Remarks
     * The ith argument to the circuit occupies the ith argument of the vector.
     * The length of this vector equals the number of arguments to the circuit.
     */
    pub returns: Vec<Type>,

    /**
     * The number of ciphertexts that compose the nth return value.
     */
    pub num_ciphertexts: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
/**
 * A key type required for a circuit to function correctly.
 */
pub enum RequiredKeys {
    /**
     * The circuit performs SIMD shifts and requires Galois keys.
     */
    Galois,
    /**
     * The circuit performs relinearizations and requires relinearization keys.
     */
    Relin,

    /**
     * The circuit performs an operation that requires the public encryption key.
     */
    PublicKey,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
/**
 * The parameter set required for a given circuit to run efficiently and correctly.
 */
pub struct Params {
    /**
     * The lattice dimension. For CKKS and BFV, this is the degree of the ciphertext polynomial.
     */
    pub lattice_dimension: u64,

    /**
     * The modulii for each modulo switch level for BFV and CKKS.
     */
    pub coeff_modulus: Vec<u64>,

    /**
     * The plaintext modulus.
     */
    pub plain_modulus: u64,

    /**
     * The scheme type.
     */
    pub scheme_type: SchemeType,

    /**
     * The securtiy level required.
     */
    pub security_level: SecurityLevel,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
/**
 * A serializable list of requirements for a circuit.
 */
pub struct CircuitMetadata {
    /**
     * The FHE scheme parameters required for encrypting data for use in the circuit.
     */
    pub params: Params,

    /**
     * The call signature (arguments and returns) of the circuit.
     */
    pub signature: CallSignature,

    /**
     * The set of keys required to run the circuit.
     */
    pub required_keys: Vec<RequiredKeys>,
}

/**
 * A circuit with its associated metadata.
 */
pub struct CompiledCircuit {
    /**
     * The underlying FHE circuit.
     */
    pub circuit: Circuit,

    /**
     * Information about the circuit, including its call signature and the scheme
     * parameters needed by a [`Runtime`] to encrypt/decrypt its inputs/outputs.
     */
    pub metadata: CircuitMetadata,
}
