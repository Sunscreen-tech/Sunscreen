use crate::fhe::{FheCompile, FheFrontendCompilation};
use crate::params::{determine_params, PlainModulusConstraint};
use crate::{
    zkp, Application, CallSignature, Error, FheProgramMetadata, Params, RequiredKeys, Result,
    SchemeType, SecurityLevel, ZkpProgramFn,
};
use std::collections::{HashMap, HashSet};
use std::marker::PhantomData;
use sunscreen_fhe_program::FheProgramTrait;
use sunscreen_runtime::{marker, CompiledFheProgram, Fhe, FheRuntime, FheZkp, Zkp};
use sunscreen_zkp_backend::{CompiledZkpProgram, FieldSpec, ZkpBackend, ZkpProgramMetadata};

#[derive(Debug, Clone)]
enum ParamsMode {
    Search,
    Manual(Params),
}

/**
 * The operations supported by an `#[fhe_program]` function.
 */
pub trait FheProgramFn {
    /**
     * Get the call signature of the function
     */
    fn signature(&self) -> CallSignature;

    /**
     * Build the `#[fhe_program]` into a compiled frontend.
     *
     * You should not have to call this function directly.
     */
    fn build(&self, params: &Params) -> Result<FheFrontendCompilation>;

    /**
     * Get the scheme type.
     */
    fn scheme_type(&self) -> SchemeType;

    /**
     * Gets the name of the FHE program.
     */
    fn name(&self) -> &str;

    /**
     * The number of times to chain this FHE program.
     */
    fn chain_count(&self) -> usize;

    /**
     * Returns the source code of this FHE program as a &str.
     */
    fn source(&self) -> &'static str;
}

/// An extension of [`FheProgramFn`], providing helpers and convenience methods.
pub trait FheProgramFnExt: FheProgramFn {
    /// Compile the `#[fhe_program]` into a [runnable][sunscreen_runtime::GenericRuntime::run]
    /// [`CompiledFheProgram`].
    ///
    /// This is a convenient way to compile just a single FHE program.
    /// ```rust
    /// use sunscreen::{fhe_program, types::{bfv::Signed, Cipher}, FheProgramFnExt};
    ///
    /// #[fhe_program(scheme = "bfv")]
    /// fn multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    ///     a * b
    /// }
    /// # fn main() -> Result<(), sunscreen::Error> {
    /// let multiply_prog = multiply.compile()?;
    /// # Ok(())
    /// # }
    /// ```
    ///
    /// It is shorthand for:
    /// ```rust
    /// use sunscreen::{fhe_program, types::{bfv::Signed, Cipher}, Compiler};
    ///
    /// #[fhe_program(scheme = "bfv")]
    /// fn multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    ///     a * b
    /// }
    /// # fn main() -> Result<(), sunscreen::Error> {
    /// let app = Compiler::new().fhe_program(multiply).compile()?;
    /// let multiply_prog = app.get_fhe_program(multiply).unwrap();
    /// # Ok(())
    /// # }
    /// ```
    fn compile(&self) -> Result<CompiledFheProgram>
    where
        Self: AsRef<str> + Sized + Clone + 'static,
    {
        Ok(Compiler::new()
            .fhe_program(self.clone())
            .compile()?
            .take_fhe_program(self)
            .unwrap())
    }

    /// Make a new [`FheRuntime`] with parameters suitable to run this `#[fhe_program]`.
    ///
    /// This is a convenient way to run a single FHE program.
    /// ```rust
    /// use sunscreen::{fhe_program, types::{bfv::Signed, Cipher}, FheProgramFnExt};
    ///
    /// #[fhe_program(scheme = "bfv")]
    /// fn multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    ///     a * b
    /// }
    /// # fn main() -> Result<(), sunscreen::Error> {
    /// let runtime = multiply.runtime()?;
    /// # Ok(())
    /// # }
    /// ```
    ///
    /// It is shorthand for:
    /// ```rust
    /// use sunscreen::{fhe_program, types::{bfv::Signed, Cipher}, Compiler, FheRuntime};
    ///
    /// #[fhe_program(scheme = "bfv")]
    /// fn multiply(a: Cipher<Signed>, b: Cipher<Signed>) -> Cipher<Signed> {
    ///     a * b
    /// }
    /// # fn main() -> Result<(), sunscreen::Error> {
    /// let app = Compiler::new().fhe_program(multiply).compile()?;
    /// let runtime = FheRuntime::new(app.params());
    /// # Ok(())
    /// # }
    /// ```
    fn runtime(&self) -> Result<FheRuntime>
    where
        Self: AsRef<str> + Sized + Clone + 'static,
    {
        let app = Compiler::new().fhe_program(self.clone()).compile()?;
        Ok(FheRuntime::new(app.params())?)
    }
}

impl<T: ?Sized> FheProgramFnExt for T where T: FheProgramFn {}

struct FheCompilerData {
    fhe_program_fns: Vec<Box<dyn FheProgramFn>>,
    params_mode: ParamsMode,
    plain_modulus_constraint: PlainModulusConstraint,
    security_level: SecurityLevel,
    noise_margin: u32,
}

impl Default for FheCompilerData {
    fn default() -> Self {
        Self {
            fhe_program_fns: vec![],
            params_mode: ParamsMode::Search,
            // This default value is sufficient for doing 3 levels of 64-bit
            // multiplications
            plain_modulus_constraint: PlainModulusConstraint::Raw(262_144),
            security_level: SecurityLevel::TC128,
            noise_margin: 20,
        }
    }
}

impl<B> Default for ZkpCompilerData<B> {
    fn default() -> Self {
        Self {
            zkp_program_fns: vec![],
        }
    }
}

struct ZkpCompilerData<B> {
    // In practice, B should always be BoxZkpFn<Field = F>> where
    // F: FieldSpec.
    zkp_program_fns: Vec<B>,
}

enum CompilerData<B> {
    None,
    Fhe(FheCompilerData),
    Zkp(ZkpCompilerData<B>),
    FheZkp(FheCompilerData, ZkpCompilerData<B>),
}

impl<B> CompilerData<B> {
    fn new_fhe(data: FheCompilerData) -> Self {
        Self::Fhe(data)
    }

    fn new_zkp(data: ZkpCompilerData<B>) -> Self {
        Self::Zkp(data)
    }

    fn new_fhe_zkp(fhe_data: FheCompilerData, zkp_data: ZkpCompilerData<B>) -> Self {
        Self::FheZkp(fhe_data, zkp_data)
    }

    fn zkp_data_mut(&mut self) -> &mut ZkpCompilerData<B> {
        match self {
            Self::Zkp(d) => d,
            Self::FheZkp(_, d) => d,
            _ => unreachable!(),
        }
    }

    fn zkp_data(&self) -> &ZkpCompilerData<B> {
        match self {
            Self::Zkp(d) => d,
            Self::FheZkp(_, d) => d,
            _ => unreachable!(),
        }
    }

    fn fhe_data_mut(&mut self) -> &mut FheCompilerData {
        match self {
            Self::Fhe(d) => d,
            Self::FheZkp(d, _) => d,
            _ => unreachable!(),
        }
    }

    fn fhe_data(&self) -> &FheCompilerData {
        match self {
            Self::Fhe(d) => d,
            Self::FheZkp(d, _) => d,
            _ => unreachable!(),
        }
    }

    fn unwrap_zkp(self) -> ZkpCompilerData<B> {
        match self {
            Self::Zkp(d) => d,
            Self::FheZkp(_, d) => d,
            _ => unreachable!(),
        }
    }

    fn unwrap_fhe(self) -> FheCompilerData {
        match self {
            Self::Fhe(d) => d,
            Self::FheZkp(d, _) => d,
            _ => unreachable!(),
        }
    }
}

type BoxZkpFn<F> = Box<dyn ZkpProgramFn<F>>;

/**
 * A frontend compiler for Sunscreen FHE programs.
 */
pub struct GenericCompiler<T, B> {
    data: CompilerData<B>,
    _phantom: PhantomData<T>,
}

impl Default for GenericCompiler<(), ()> {
    fn default() -> Self {
        Self::new()
    }
}

impl Compiler {
    /**
     * Creates a new [`Compiler`] builder.
     */
    pub fn new() -> Self {
        Self {
            data: CompilerData::None,
            _phantom: PhantomData,
        }
    }

    /**
     * Add the given FHE program for compilation.
     */
    pub fn fhe_program<F>(self, fhe_program_fn: F) -> FheCompiler
    where
        F: FheProgramFn + 'static,
    {
        let mut data = CompilerData::new_fhe(FheCompilerData::default());
        data.fhe_data_mut()
            .fhe_program_fns
            .push(Box::new(fhe_program_fn));

        FheCompiler {
            data,
            _phantom: PhantomData,
        }
    }

    /**
     * Sets the ZKP backend target.
     */
    pub fn zkp_backend<B: ZkpBackend>(self) -> ZkpCompiler<B::Field> {
        let data = CompilerData::new_zkp(ZkpCompilerData::default());

        ZkpCompiler {
            data,
            _phantom: PhantomData,
        }
    }
}

impl<T, B> GenericCompiler<T, B> {
    fn compile_fhe(&self) -> Result<HashMap<String, CompiledFheProgram>> {
        let fhe_data: &FheCompilerData = self.data.fhe_data();

        if fhe_data.fhe_program_fns.is_empty() {
            return Ok(HashMap::new());
        }

        // Check that all programs use the same scheme type.
        // Unwrapping the iterator is safe because we checked that
        // self.fhe_program_fns has at least 1 element
        if fhe_data
            .fhe_program_fns
            .iter()
            .any(|p| p.scheme_type() != fhe_data.fhe_program_fns.first().unwrap().scheme_type())
        {
            return Err(Error::SchemeMismatch);
        }

        // Check that each fhe_program has a unique name
        if fhe_data
            .fhe_program_fns
            .iter()
            .map(|f| f.name().to_owned())
            .collect::<HashSet<String>>()
            .len()
            != fhe_data.fhe_program_fns.len()
        {
            return Err(Error::NameCollision);
        }

        // Check that every chain_count > 0.
        if fhe_data
            .fhe_program_fns
            .iter()
            .any(|p| p.chain_count() == 0)
        {
            return Err(Error::unsupported("Chain count must be greater than zero."));
        }

        // Check that either the max chain count is 1, or that only
        // one FHE program is specified in the application.
        // This restriction will be removed in the future.
        let max_chain = fhe_data
            .fhe_program_fns
            .iter()
            .fold(0, |max, p| usize::max(p.chain_count(), max));

        if max_chain > 1 && fhe_data.fhe_program_fns.len() > 1 {
            return Err(Error::unsupported(
                "Cannot chain programs and specify more than one program in the same app.",
            ));
        }

        let scheme = fhe_data.fhe_program_fns.first().unwrap().scheme_type();

        let params = match &fhe_data.params_mode {
            ParamsMode::Manual(p) => p.clone(),
            ParamsMode::Search => determine_params(
                &fhe_data.fhe_program_fns,
                fhe_data.plain_modulus_constraint,
                fhe_data.security_level,
                fhe_data.noise_margin,
                scheme,
            )?,
        };

        let fhe_programs = fhe_data
            .fhe_program_fns
            .iter()
            .map(|prog| {
                let execution_graph = prog.build(&params);
                let mut required_keys = vec![];
                let fhe_program_fn = execution_graph?.compile();

                if fhe_program_fn.requires_relin_keys() {
                    required_keys.push(RequiredKeys::Relin);
                }

                if fhe_program_fn.requires_galois_keys() {
                    required_keys.push(RequiredKeys::Galois);
                }

                let metadata = FheProgramMetadata {
                    params: params.clone(),
                    required_keys,
                    signature: prog.signature(),
                    name: prog.name().to_owned(),
                };

                let compiled_program = CompiledFheProgram {
                    fhe_program_fn,
                    metadata,
                };

                Ok((prog.name().to_owned(), compiled_program))
            })
            .collect::<Result<HashMap<_, _>>>()?;

        Ok(fhe_programs)
    }
}

impl<T, B> GenericCompiler<T, BoxZkpFn<B>>
where
    B: FieldSpec,
{
    fn compile_zkp(&self) -> Result<HashMap<String, CompiledZkpProgram>> {
        let zkp_data = self.data.zkp_data();

        let zkp_programs = zkp_data
            .zkp_program_fns
            .iter()
            .map(|prog| {
                let result = prog.build()?;
                let result = zkp::compile(&result);

                Ok((
                    prog.name().to_owned(),
                    CompiledZkpProgram {
                        graph: result,
                        metadata: ZkpProgramMetadata {
                            name: prog.name().to_string(),
                            source: prog.source().to_string(),
                        },
                    },
                ))
            })
            .collect::<Result<HashMap<_, _>>>()?;

        Ok(zkp_programs)
    }

    fn compile_internal(self) -> Result<Application<T>> {
        Application::new(HashMap::new(), self.compile_zkp()?)
    }
}

impl FheCompiler {
    /**
     * Add the given FHE program for compilation.
     */
    pub fn fhe_program<F>(mut self, fhe_program_fn: F) -> FheCompiler
    where
        F: FheProgramFn + 'static,
    {
        self.data
            .fhe_data_mut()
            .fhe_program_fns
            .push(Box::new(fhe_program_fn));
        self
    }

    /**
     * Set a ZKP backend for compiling ZKP programs.
     */
    pub fn zkp_backend<B: ZkpBackend>(self) -> FheZkpCompiler<BoxZkpFn<B::Field>> {
        let data = CompilerData::new_fhe_zkp(self.data.unwrap_fhe(), ZkpCompilerData::default());

        FheZkpCompiler {
            data,
            _phantom: PhantomData,
        }
    }

    /**
     * Compile the FHE programs. If successful, returns an
     * [`Application`] containing a compiled form of each
     * `fhe_program` and argument.
     *
     * # Remarks
     * Each compiled FHE program in the returned [`Application`]
     * is compiled under the same [`Params`] so ciphertexts can be
     * used interchangeably between programs.
     *
     * Each specified FHE program must have a unique name,
     * regardless of its parent module or crate. `compile` returns
     * a [`Error::NameCollision`] if two or more FHE programs
     * have the same name.
     *
     * Each FHE program must use the same scheme or `compile`
     * will return a [`Error::NameCollision`] error.
     */
    pub fn compile(self) -> Result<Application<Fhe>> {
        Application::new(self.compile_fhe()?, HashMap::new())
    }
}

impl<B> ZkpCompiler<B>
where
    B: FieldSpec,
{
    /**
     * Add the given FHE program for compilation.
     */
    pub fn fhe_program<F>(self, fhe_program_fn: F) -> FheZkpCompiler<B>
    where
        F: FheProgramFn + 'static,
    {
        let mut fhe_data = FheCompilerData::default();
        fhe_data.fhe_program_fns.push(Box::new(fhe_program_fn));

        FheZkpCompiler {
            data: CompilerData::new_fhe_zkp(fhe_data, self.data.unwrap_zkp()),
            _phantom: PhantomData,
        }
    }

    /**
     * Add the given FHE program for compilation.
     */
    pub fn zkp_program<F>(mut self, zkp_program_fn: F) -> Self
    where
        F: ZkpProgramFn<B> + 'static,
    {
        self.data
            .zkp_data_mut()
            .zkp_program_fns
            .push(Box::new(zkp_program_fn));
        self
    }

    /**
     * Compile the ZKP programs. If successful, returns an
     * [`Application`] containing a compiled form of each
     * `zkp_program` argument.
     *
     * # Remarks
     * Each specified ZKP program must have a unique name,
     * regardless of its parent module or crate. `compile` returns
     * a [`Error::NameCollision`] if two or more FHE programs
     * have the same name.
     */
    pub fn compile(self) -> Result<Application<Zkp>> {
        self.compile_internal()
    }
}

impl<B> FheZkpCompiler<B>
where
    B: FieldSpec,
{
    /**
     * Add the given FHE program for compilation.
     */
    pub fn fhe_program<F>(mut self, fhe_program_fn: F) -> Self
    where
        F: FheProgramFn + 'static,
    {
        self.data
            .fhe_data_mut()
            .fhe_program_fns
            .push(Box::new(fhe_program_fn));
        self
    }

    /**
     * Add the given FHE program for compilation.
     */
    pub fn zkp_program<F>(mut self, zkp_program_fn: F) -> Self
    where
        F: ZkpProgramFn<B> + 'static,
    {
        self.data
            .zkp_data_mut()
            .zkp_program_fns
            .push(Box::new(zkp_program_fn));
        self
    }

    /**
     * Compile the FHE and ZKP programs. If successful, returns an
     * [`Application`] containing a compiled form of each
     * `fhe_program` and `zkp_program` argument.
     *
     * # Remarks
     * Each compiled FHE program in the returned [`Application`]
     * is compiled under the same [`Params`] so ciphertexts can be
     * used interchangeably between programs.
     *
     * Each specified FHE and ZKP program must have a unique name,
     * regardless of its parent module or crate. `compile` returns
     * a [`Error::NameCollision`] if two or more FHE programs
     * have the same name.
     *
     * Each FHE program must use the same scheme or `compile`
     * will return a [`Error::NameCollision`] error.
     */
    pub fn compile(self) -> Result<Application<FheZkp>> {
        self.compile_internal()
    }
}

impl<T, B> GenericCompiler<T, B>
where
    T: marker::Fhe,
{
    /**
     * Set the compiler to search for suitable encryption scheme parameters for the FHE program.
     */
    pub fn find_params(mut self) -> Self {
        self.data.fhe_data_mut().params_mode = ParamsMode::Search;
        self
    }

    /**
     * Set the constraint the parameter search algorithm places on the plaintext modulus.
     * You can either force the algorithm to use an exact value or any value that supports
     * batching of at least n bits in length.
     */
    pub fn plain_modulus_constraint(mut self, p: PlainModulusConstraint) -> Self {
        self.data.fhe_data_mut().plain_modulus_constraint = p;
        self
    }

    /**
     * Don't use the parameter search algorithm, and instead explicitly set the scheme's parameters.
     * For expert use and may cause failures.
     */
    pub fn with_params(mut self, params: &Params) -> Self {
        self.data.fhe_data_mut().params_mode = ParamsMode::Manual(params.clone());
        self
    }

    /**
     * Set the security level. If unspecified, the compiler assumes 128-bit security.
     */
    pub fn security_level(mut self, security_level: SecurityLevel) -> Self {
        self.data.fhe_data_mut().security_level = security_level;
        self
    }

    /**
     * The minimum number of bits of noise budget the search algorithm will leave for all outputs.
     */
    pub fn additional_noise_budget(mut self, noise_margin: u32) -> Self {
        self.data.fhe_data_mut().noise_margin = noise_margin;
        self
    }
}

/**
 * A compiler that has not yet been types. After calling
 * [`Compiler::new`], the builder type evolves as you specify parameters
 * and new configurations become valid.
 */
pub type Compiler = GenericCompiler<(), ()>;
pub type FheCompiler = GenericCompiler<Fhe, ()>;
pub type ZkpCompiler<F> = GenericCompiler<Zkp, BoxZkpFn<F>>;
pub type FheZkpCompiler<F> = GenericCompiler<FheZkp, BoxZkpFn<F>>;

#[cfg(test)]
mod tests {
    use std::any::{Any, TypeId};

    use sunscreen_compiler_macros::{fhe_program, zkp_program};
    use sunscreen_zkp_backend::bulletproofs::BulletproofsBackend;

    use super::*;

    // Needed to make the fhe_program macro work.
    use crate::{self as sunscreen, types::zkp::Field};

    #[test]
    fn raw_compiler_has_correct_type() {
        let c = Compiler::new();

        assert_eq!(c.type_id(), TypeId::of::<Compiler>());
    }

    #[test]
    fn fhe_program_yields_fhe_compiler() {
        #[fhe_program(scheme = "bfv")]
        fn kitty() {}

        let c = Compiler::new().fhe_program(kitty);

        assert_eq!(c.type_id(), TypeId::of::<FheCompiler>());
    }

    #[test]
    fn zkp_program_yields_zkp_compiler() {
        let c = Compiler::new().zkp_backend::<BulletproofsBackend>();

        assert_eq!(
            c.type_id(),
            TypeId::of::<ZkpCompiler<<BulletproofsBackend as ZkpBackend>::Field>>()
        );
    }

    #[test]
    fn fhe_zkp_program_yields_fhezkp_compiler() {
        #[zkp_program]
        fn kitty<F: FieldSpec>() {}

        #[fhe_program(scheme = "bfv")]
        fn doggie() {}

        let c = GenericCompiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .fhe_program(doggie);

        assert_eq!(
            c.type_id(),
            TypeId::of::<FheZkpCompiler<<BulletproofsBackend as ZkpBackend>::Field>>()
        );
    }

    #[test]
    fn compiling_fhe_program_yields_fhe_application() {
        #[fhe_program(scheme = "bfv")]
        fn kitty() {}

        let app = Compiler::new().fhe_program(kitty).compile().unwrap();

        assert_eq!(app.type_id(), TypeId::of::<Application<Fhe>>());
    }

    #[test]
    fn compiling_zkp_program_yields_zkp_application() {
        #[zkp_program]
        fn kitty<F: FieldSpec>() {}

        let app = GenericCompiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(kitty)
            .compile()
            .unwrap();

        assert_eq!(app.type_id(), TypeId::of::<Application<Zkp>>());
    }

    #[test]
    fn compiling_fhe_and_zkp_program_yields_fhezkp_application() {
        #[zkp_program]
        fn kitty<F: FieldSpec>(_a: Field<F>) {}

        #[fhe_program(scheme = "bfv")]
        fn doggie() {}

        let app = GenericCompiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(kitty)
            .fhe_program(doggie)
            .compile()
            .unwrap();

        assert_eq!(app.type_id(), TypeId::of::<Application<FheZkp>>());
    }
}
