use crate::{
    Ciphertext, Error, FheProgramCiphertextInput, FheProgramPlaintextInput, InnerCiphertext,
    InnerPlaintext, IntoCiphertext, NumCiphertexts, Params, Plaintext, Result, TryFromPlaintext,
    TryIntoPlaintext, Type, TypeName, TypeNameInstance, WithContext,
};
use seal_fhe::{Ciphertext as SealCiphertext, Plaintext as SealPlaintext};

impl<T, const N: usize> TryIntoPlaintext for [T; N]
where
    T: TryIntoPlaintext,
    Self: TypeName,
{
    fn try_into_plaintext(&self, params: &Params) -> Result<Plaintext> {
        let element_plaintexts = self
            .iter()
            .map(|v| v.try_into_plaintext(params))
            .collect::<Result<Vec<Plaintext>>>()?
            .drain(0..)
            .flat_map(|p| match p.inner {
                InnerPlaintext::Seal(v) => v,
            })
            .collect::<Vec<WithContext<SealPlaintext>>>();

        Ok(Plaintext {
            inner: InnerPlaintext::Seal(element_plaintexts),
            data_type: Self::type_name(),
        })
    }
}

impl<T, const N: usize> TryFromPlaintext for [T; N]
where
    T: TryFromPlaintext + TypeName + NumCiphertexts,
    Self: TypeName + NumCiphertexts,
{
    fn try_from_plaintext(plaintext: &Plaintext, params: &Params) -> Result<Self> {
        let data = match &plaintext.inner {
            InnerPlaintext::Seal(p) => {
                if p.len() != Self::NUM_CIPHERTEXTS {
                    return Err(Error::MalformedPlaintext);
                }

                p.chunks(T::NUM_CIPHERTEXTS)
                    .map(|c| {
                        let p = Plaintext {
                            data_type: T::type_name(),
                            inner: InnerPlaintext::Seal(c.to_owned()),
                        };

                        T::try_from_plaintext(&p, params)
                    })
                    .collect::<Result<Vec<T>>>()?
            }
        };

        Ok(match data.try_into() {
            Ok(v) => v,
            _ => unreachable!(),
        })
    }
}

impl<T, const N: usize> TypeNameInstance for [T; N]
where
    T: TypeName,
{
    fn type_name_instance(&self) -> Type {
        Self::type_name()
    }
}

impl<T, const N: usize> FheProgramPlaintextInput for [T; N] where T: TypeName + TryIntoPlaintext {}

impl<T, const N: usize> NumCiphertexts for [T; N]
where
    T: NumCiphertexts,
{
    const NUM_CIPHERTEXTS: usize = T::NUM_CIPHERTEXTS * N;
}

impl<T, const N: usize> IntoCiphertext for [T; N]
where
    T: IntoCiphertext,
    Self: TypeName,
{
    fn into_ciphertext(&self) -> Ciphertext {
        let element_ciphertexts = self
            .iter()
            .map(|v| v.into_ciphertext())
            .flat_map(|p| match p.inner {
                InnerCiphertext::Seal(v) => v,
            })
            .collect::<Vec<WithContext<SealCiphertext>>>();

        Ciphertext {
            inner: InnerCiphertext::Seal(element_ciphertexts),
            data_type: Self::type_name(),
        }
    }
}

impl<T, const N: usize> FheProgramCiphertextInput for [T; N] where T: TypeName + IntoCiphertext {}
