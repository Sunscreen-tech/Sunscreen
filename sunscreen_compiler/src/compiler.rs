use crate::params::{determine_params, PlainModulusConstraint};
use crate::{
    CallSignature, CircuitMetadata, Error, FrontendCompilation, Params, RequiredKeys, Result,
    SchemeType, SecurityLevel,
};
use sunscreen_runtime::CompiledCircuit;

#[derive(Debug, Clone)]
enum ParamsMode {
    Search,
    Manual(Params),
}

/**
 * The operations supported by a #\[circuit\] function.
 */
pub trait CircuitFn {
    /**
     * Get the call signature of the function
     */
    fn signature(&self) -> CallSignature;

    /**
     * Compile the circuit.
     */
    fn build(&self, params: &Params) -> Result<FrontendCompilation>;

    /**
     * Get the scheme type.
     */
    fn scheme_type(&self) -> SchemeType;
}

/**
 * A frontend circuit compiler for Sunscreen circuits.
 */
pub struct Compiler<F>
where
    F: CircuitFn,
{
    fhe_program_fn: F,
    params_mode: ParamsMode,
    plain_modulus_constraint: Option<PlainModulusConstraint>,
    security_level: SecurityLevel,
    noise_margin: u32,
}

impl<F> Compiler<F>
where
    F: CircuitFn,
{
    /**
     * Create a new compiler with the given circuit.
     */
    pub fn with_fhe_program(fhe_program_fn: F) -> Self {
        Self {
            fhe_program_fn,
            params_mode: ParamsMode::Search,
            plain_modulus_constraint: None,
            security_level: SecurityLevel::TC128,
            noise_margin: 10,
        }
    }

    /**
     * Set the compiler to search for suitable encryption scheme parameters for the circuit.
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
        self.plain_modulus_constraint = Some(p);
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
    pub fn noise_margin_bits(mut self, noise_margin: u32) -> Self {
        self.noise_margin = noise_margin;
        self
    }

    /**
     * Comile the circuit. If successful, returns a tuple of the [`Circuit`](crate::Circuit) and the [`Params`] suitable
     * for running it.
     */
    pub fn compile(self) -> Result<CompiledCircuit> {
        let scheme = self.fhe_program_fn.scheme_type();
        let signature = self.fhe_program_fn.signature();

        let (fhe_program_fn, params) = match self.params_mode {
            ParamsMode::Manual(p) => (self.fhe_program_fn.build(&p), p.clone()),
            ParamsMode::Search => {
                let constraint = self
                    .plain_modulus_constraint
                    .ok_or(Error::MissingPlainModulusConstraint)?;

                let params = determine_params::<F>(
                    &self.fhe_program_fn,
                    constraint,
                    self.security_level,
                    self.noise_margin,
                    scheme,
                )?;

                (self.fhe_program_fn.build(&params), params.clone())
            }
        };

        let mut required_keys = vec![];

        let fhe_program_fn = fhe_program_fn?.compile();

        if fhe_program_fn.requires_relin_keys() {
            required_keys.push(RequiredKeys::Relin);
        }

        if fhe_program_fn.requires_galois_keys() {
            required_keys.push(RequiredKeys::Galois);
        }

        let metadata = CircuitMetadata {
            params: params,
            required_keys,
            signature,
        };

        Ok(CompiledCircuit { fhe_program_fn, metadata })
    }
}
