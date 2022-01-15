use crate::Params;
use seal::{
    BfvEncryptionParametersBuilder, Context, FromBytes, GaloisKeys, Modulus,
    PublicKey as SealPublicKey, RelinearizationKeys, ToBytes,
};
use serde::{
    de::{Deserializer, MapAccess, Visitor},
    ser::{Error, SerializeStruct, Serializer},
    Deserialize, Serialize,
};

#[derive(Clone)]
/**
 * A data type that contains parameters for reconstructing a context
 * during deserialization (needed by SEAL).
 */
pub struct WithContext<T>
where
    T: ToBytes + FromBytes,
{
    /**
     * The scheme parameters under which this key is valid.
     */
    pub params: Params,

    /**
     * The key itself.
     */
    pub data: T,
}

impl<T> Serialize for WithContext<T>
where
    T: ToBytes + FromBytes,
{
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let mut state = serializer.serialize_struct("WithContext", 2)?;
        state.serialize_field("params", &self.params)?;
        state.serialize_field(
            "data",
            &self
                .data
                .as_bytes()
                .map_err(|e| S::Error::custom(format!("Failed to serialize key: {}", e)))?,
        )?;
        state.end()
    }
}

impl<'de, T> Deserialize<'de> for WithContext<T>
where
    T: ToBytes + FromBytes,
{
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct WithContextVisitor<T>
        where
            T: ToBytes + FromBytes,
        {
            marker: std::marker::PhantomData<T>,
        }

        impl<'de, T> Visitor<'de> for WithContextVisitor<T>
        where
            T: ToBytes + FromBytes,
        {
            type Value = WithContext<T>;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                write!(formatter, "struct with 'params' and 'keys' fields")
            }

            fn visit_map<A>(self, mut map: A) -> Result<Self::Value, A::Error>
            where
                A: MapAccess<'de>,
            {
                let mut params: Option<Params> = None;
                let mut data: Option<Vec<u8>> = None;

                while let Some(key) = map.next_key()? {
                    match key {
                        "params" => {
                            let val: Option<Params> = map.next_value()?;

                            if let Some(val) = val {
                                params = Some(val);
                            } else {
                                return Err(serde::de::Error::missing_field("params"));
                            }
                        },
                        "data" => {
                            let val: Option<Vec<u8>> = map.next_value()?;

                            if let Some(val) = val {
                                data = Some(val);
                            } else {
                                return Err(serde::de::Error::missing_field("data"));
                            }
                        },
                        x => {
                            return Err(serde::de::Error::unknown_field(x, &["params", "data"]));
                        }
                    };
                }

                let params_empty = params.is_none();

                if let (Some(params), Some(data)) = (params, data) {
                    let coeffs = params
                        .coeff_modulus
                        .iter()
                        .map(|x| Modulus::new(*x))
                        .collect::<std::result::Result<Vec<Modulus>, seal::Error>>()
                        .map_err(|e| serde::de::Error::custom(format!("{}", e)))?;

                    let encryption_params = BfvEncryptionParametersBuilder::new()
                        .set_coefficient_modulus(coeffs)
                        .set_plain_modulus_u64(params.plain_modulus)
                        .set_poly_modulus_degree(params.lattice_dimension)
                        .build()
                        .map_err(|e| serde::de::Error::custom(format!("{}", e)))?;

                    let seal_context =
                        Context::new(&encryption_params, false, params.security_level)
                        .map_err(|e| serde::de::Error::custom(format!("{}", e)))?;

                    let data = T::from_bytes(&seal_context, &data).map_err(|e| serde::de::Error::custom(format!("{}", e)))?;

                    Ok(WithContext::<T> { params, data })
                } else {
                    if params_empty {
                        Err(serde::de::Error::missing_field("params"))
                    } else {
                        Err(serde::de::Error::missing_field("key"))
                    }
                }
            }
        }

        const FIELDS: &'static [&'static str] = &["params", "key"];
        deserializer.deserialize_struct("WithContext", FIELDS, WithContextVisitor { marker: std::marker::PhantomData::default() })
    }
}

#[derive(Clone)]
/**
 * A bundle of public keys. These may be freely shared with other parties without
 * risk of compromising data security.
 *
 * # Remarks
 * In traditional asymmetric cryptography (e.g. RSA, ECC), schemes contain only public
 * and secret keys. The public key is used for encryption and the secret key is used to
 * decrypt data.
 *
 * In addition to the tradtional public key, homomorphic cryptographic schemes may have
 * additional keys to facilitate certain homomorphic operations. These keys are "public"
 * in the sense that they may be freely shared without compromising data privacy, but
 * they are generally used for operations other than encryption. For example,
 * [`RelinearizationKeys`] are used in the BFV and CKKS schemes to reduce noise growth
 * and prevent ciphertext size growth after multiplication.
 */
pub struct PublicKey {
    /**
     * The public key used for encryption operations.
     */
    pub public_key: WithContext<SealPublicKey>,

    /**
     * Galois keys are used in BFV and CKKS schemes to rotate SIMD vectors.
     *
     * Circuits that don't feature rotations have no use for these keys.
     */
    pub galois_key: Option<GaloisKeys>,

    /**
     * Relinearization keys are used in the BFV and CKKS schemes during relinearization
     * operations. Relinearization reduces noise growth and prevents ciphertext size growth
     * resulting from multiplication. Sunscreen automatically inserts relinearization operations,
     * and hence they are an implementation detail.
     *
     * Circuits without multiplications don't have relinearizations and thus don't need these keys.
     */
    pub relin_key: Option<RelinearizationKeys>,
}

#[cfg(test)] 
mod tests {
    use crate::*;
    use super::*;
    use seal::{CoefficientModulus, SecurityLevel};
    use sunscreen_circuit::{SchemeType};

    #[test]
    fn can_roundtrip_seal_public_key() {
        let runtime = Runtime::new(&Params {
            lattice_dimension: 8192,
            security_level: SecurityLevel::TC128,
            plain_modulus: 1234,
            scheme_type: SchemeType::Bfv,
            coeff_modulus: CoefficientModulus::bfv_default(8192, SecurityLevel::TC128).unwrap().iter().map(|x| x.value()).collect(),
        }).unwrap();

        let (public, _) = runtime.generate_keys().unwrap();

        let data = serde_json::to_string_pretty(&public.public_key).unwrap();
        let enc_key: WithContext<SealPublicKey> = serde_json::from_str(&data).unwrap();

        let public_2 = PublicKey {
            public_key: enc_key,
            ..public
        };

        assert_eq!(public.public_key.data.as_bytes(), public_2.public_key.data.as_bytes());
    }
}