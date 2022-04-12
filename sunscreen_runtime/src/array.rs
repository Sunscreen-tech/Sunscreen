use crate::{
    FheProgramInputTrait, InnerPlaintext, NumCiphertexts, Params, Plaintext, Result,
    TryIntoPlaintext, Type, TypeName, TypeNameInstance, WithContext,
};
use seal::Plaintext as SealPlaintext;

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

impl<T, const N: usize> TypeName for [T; N]
where
    T: TypeName,
{
    fn type_name() -> Type {
        let inner_type = T::type_name();

        Type {
            name: format!("[{};{}]", inner_type.name, N),
            ..inner_type
        }
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

impl<T, const N: usize> FheProgramInputTrait for [T; N] where T: TypeName + TryIntoPlaintext {}

impl<T, const N: usize> NumCiphertexts for [T; N]
where
    T: NumCiphertexts,
{
    const NUM_CIPHERTEXTS: usize = T::NUM_CIPHERTEXTS * N;
}
