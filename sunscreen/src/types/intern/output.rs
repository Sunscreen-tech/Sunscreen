use crate::{
    fhe::{with_fhe_ctx, FheContextOps},
    types::{intern::FheProgramNode, NumCiphertexts},
};

/**
 * Captures an output for an FHE program.
 */
pub trait Output {
    /**
     * The captured object return type.
     */
    type Output;

    /**
     * Denote this object is an output by appending an appropriate output FHE program nodes
     *
     * You should not call this, but rather allow the [`fhe_program`](crate::fhe_program) macro to do this on your behalf.
     *
     * # Undefined behavior
     * This type references memory in a backing
     * [`FheContext`](crate::fhe::FheContext) and without carefully
     * ensuring FheProgramNodes never outlive the backing context,
     * use-after-free can occur.
     */
    fn output(&self) -> Self::Output;
}

impl<T> Output for FheProgramNode<T>
where
    T: NumCiphertexts,
{
    type Output = FheProgramNode<T>;

    fn output(&self) -> Self::Output {
        let mut ids = Vec::with_capacity(self.ids.len());

        for i in 0..self.ids.len() {
            ids.push(with_fhe_ctx(|ctx| ctx.add_output(self.ids[i])));
        }

        FheProgramNode::new(&ids)
    }
}

impl<T, const N: usize> Output for [T; N]
where
    T: Output + NumCiphertexts + Copy,
{
    type Output = [T::Output; N];

    fn output(&self) -> Self::Output {
        self.map(|i| i.output())
    }
}
