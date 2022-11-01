use crate::params::{determine_params, PlainModulusConstraint};
use crate::{
    Application, CallSignature, Error, FheProgramMetadata, FrontendCompilation, Params,
    RequiredKeys, Result, SchemeType, SecurityLevel,
};
use std::collections::{HashMap, HashSet};
use sunscreen_runtime::CompiledFheProgram;

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
     * Compile the `#[fhe_program]`.
     */
    fn build(&self, params: &Params) -> Result<FrontendCompilation>;

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
}

/**
 * A frontend compiler for Sunscreen FHE programs.
 */
pub struct Compiler {
    fhe_program_fns: Vec<Box<dyn FheProgramFn>>,
    params_mode: ParamsMode,
    plain_modulus_constraint: PlainModulusConstraint,
    security_level: SecurityLevel,
    noise_margin: u32,
}

impl Default for Compiler {
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
            fhe_program_fns: vec![],
            params_mode: ParamsMode::Search,
            // This default value is sufficient for doing 3 levels of 64-bit
            // multiplications
            plain_modulus_constraint: PlainModulusConstraint::Raw(262_144),
            security_level: SecurityLevel::TC128,
            noise_margin: 20,
        }
    }

    /**
     * Add the given FHE program for compilation.
     */
    pub fn fhe_program<F>(mut self, fhe_program_fn: F) -> Self
    where
        F: FheProgramFn + Clone + 'static,
    {
        self.fhe_program_fns.push(Box::new(fhe_program_fn));

        self
    }

    /**
     * Set the compiler to search for suitable encryption scheme parameters for the FHE program.
     */
    pub fn find_params(mut self) -> Self {
        self.params_mode = ParamsMode::Search;
        self
    }

    /**
     * Set the constraint the parameter search algorithm places on the plaintext modulus.
     * You can either force the algorithm to use an exact value or any value that supports
     * batching of at least n bits in length.
     */
    pub fn plain_modulus_constraint(mut self, p: PlainModulusConstraint) -> Self {
        self.plain_modulus_constraint = p;
        self
    }

    /**
     * Don't use the parameter search algorithm, and instead explicitly set the scheme's parameters.
     * For expert use and may cause failures.
     */
    pub fn with_params(mut self, params: &Params) -> Self {
        self.params_mode = ParamsMode::Manual(params.clone());
        self
    }

    /**
     * Set the security level. If unspecified, the compiler assumes 128-bit security.
     */
    pub fn security_level(mut self, security_level: SecurityLevel) -> Self {
        self.security_level = security_level;
        self
    }

    /**
     * The minimum number of bits of noise budget the search algorithm will leave for all outputs.
     */
    pub fn additional_noise_budget(mut self, noise_margin: u32) -> Self {
        self.noise_margin = noise_margin;
        self
    }

    /**
     * Compile the FHE program. If successful, returns an
     * [`Application`] containing a compiled form of each
     * `fhe_program` argument.
     *
     * # Remarks
     * Each compiled FHE program in the returned [`Application`]
     * is compiled under the same [`Params`] so ciphertexts can be
     * used interchangeably between programs.
     *
     * You must specify at least one `fhe_program` in the builder
     * before calling compile. `compile` returns a
     * [`Error::NoPrograms`] if you fail to do so.
     *
     * Each specified FHE program must have a unique name,
     * regardless of its parent module or crate. `compile` returns
     * a [`Error::NameCollision`] if two or more FHE programs
     * have the same name.
     *
     * Each FHE program must use the same scheme or `compile`
     * will return a [`Error::NameCollision`] error.
     *
     */
    pub fn compile(self) -> Result<Application> {
        if self.fhe_program_fns.is_empty() {
            return Err(Error::NoPrograms);
        }

        // Check that all programs use the same scheme type.
        // Unwrapping the iterator is safe because we checked that
        // self.fhe_program_fns has at least 1 element
        if self
            .fhe_program_fns
            .iter()
            .any(|p| p.scheme_type() != self.fhe_program_fns.first().unwrap().scheme_type())
        {
            return Err(Error::SchemeMismatch);
        }

        // Check that each fhe_program has a unique name
        if self
            .fhe_program_fns
            .iter()
            .map(|f| f.name().to_owned())
            .collect::<HashSet<String>>()
            .len()
            != self.fhe_program_fns.len()
        {
            return Err(Error::NameCollision);
        }

        // Check that every chain_count > 0.
        if self.fhe_program_fns.iter().any(|p| p.chain_count() == 0) {
            return Err(Error::Unsupported(
                "Chain count must be greater than zero.".to_owned(),
            ));
        }

        // Check that either the max chain count is 1, or that only
        // one FHE program is specified in the application.
        // This restriction will be removed in the future.
        let max_chain = self
            .fhe_program_fns
            .iter()
            .fold(0, |max, p| usize::max(p.chain_count(), max));

        if max_chain > 1 && self.fhe_program_fns.len() > 1 {
            return Err(Error::Unsupported(
                "Cannot chain programs and specify more than one program in the same app."
                    .to_owned(),
            ));
        }

        let scheme = self.fhe_program_fns.first().unwrap().scheme_type();

        let params = match self.params_mode {
            ParamsMode::Manual(p) => p,
            ParamsMode::Search => determine_params(
                &self.fhe_program_fns,
                self.plain_modulus_constraint,
                self.security_level,
                self.noise_margin,
                scheme,
            )?,
        };

        let fhe_programs = self
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
                };

                let compiled_program = CompiledFheProgram {
                    fhe_program_fn,
                    metadata,
                };

                Ok((prog.name().to_owned(), compiled_program))
            })
            .collect::<Result<HashMap<String, CompiledFheProgram>>>()?;

        Application::new(fhe_programs)
    }
}
