use crate::Params;
use seal_fhe::{BfvEncryptionParametersBuilder, Context, FromBytes, Modulus, ToBytes};
use serde::{
    de::{Deserializer, MapAccess, SeqAccess, Visitor},
    ser::{Error, SerializeStruct, Serializer},
    Deserialize, Serialize,
};

#[derive(Debug, PartialEq, Eq, Clone)]
/**
 * A data type that contains parameters for reconstructing a context
 * during deserialization (needed by SEAL).
 */
pub struct WithContext<T>
where
    T: ToBytes + FromBytes + PartialEq,
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

impl<T> std::ops::Deref for WithContext<T>
where
    T: ToBytes + FromBytes + PartialEq,
{
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.data
    }
}

impl<T> Serialize for WithContext<T>
where
    T: ToBytes + FromBytes + PartialEq,
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
    T: ToBytes + FromBytes + PartialEq,
{
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        struct WithContextVisitor<T>
        where
            T: ToBytes + FromBytes + PartialEq,
        {
            marker: std::marker::PhantomData<T>,
        }

        impl<'de, T> Visitor<'de> for WithContextVisitor<T>
        where
            T: ToBytes + FromBytes + PartialEq,
        {
            type Value = WithContext<T>;

            fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
                write!(formatter, "struct with 'params' and 'keys' fields")
            }

            fn visit_seq<V>(self, mut seq: V) -> Result<Self::Value, V::Error>
            where
                V: SeqAccess<'de>,
            {
                let params = seq
                    .next_element()?
                    .ok_or_else(|| serde::de::Error::invalid_length(0, &self))?;
                let data: Vec<u8> = seq
                    .next_element()?
                    .ok_or_else(|| serde::de::Error::invalid_length(1, &self))?;

                let data = deserialize_with_params(&params, &data)
                    .map_err(|e| serde::de::Error::custom(format!("{}", e)))?;

                Ok(Self::Value { params, data })
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
                        }
                        "data" => {
                            let val: Option<Vec<u8>> = map.next_value()?;

                            if let Some(val) = val {
                                data = Some(val);
                            } else {
                                return Err(serde::de::Error::missing_field("data"));
                            }
                        }
                        x => {
                            return Err(serde::de::Error::unknown_field(x, &["params", "data"]));
                        }
                    };
                }

                let params_empty = params.is_none();

                if let (Some(params), Some(data)) = (params, data) {
                    let data = deserialize_with_params(&params, &data)
                        .map_err(|e| serde::de::Error::custom(format!("{}", e)))?;

                    Ok(WithContext::<T> { params, data })
                } else if params_empty {
                    Err(serde::de::Error::missing_field("params"))
                } else {
                    Err(serde::de::Error::missing_field("key"))
                }
            }
        }

        const FIELDS: &[&str] = &["params", "key"];
        deserializer.deserialize_struct(
            "WithContext",
            FIELDS,
            WithContextVisitor {
                marker: std::marker::PhantomData::default(),
            },
        )
    }
}

fn deserialize_with_params<T>(params: &Params, data: &[u8]) -> Result<T, seal_fhe::Error>
where
    T: FromBytes,
{
    let coeffs = params
        .coeff_modulus
        .iter()
        .map(|x| Modulus::new(*x))
        .collect::<std::result::Result<Vec<Modulus>, seal_fhe::Error>>()?;

    let encryption_params = BfvEncryptionParametersBuilder::new()
        .set_coefficient_modulus(coeffs)
        .set_plain_modulus_u64(params.plain_modulus)
        .set_poly_modulus_degree(params.lattice_dimension)
        .build()?;

    let seal_context = Context::new(&encryption_params, false, params.security_level)?;

    let data = T::from_bytes(&seal_context, data)?;

    Ok(data)
}
