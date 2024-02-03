// For tests, see the sunscreen crate.

use std::{ops::Range, time::Instant};

use bitvec::vec::BitVec;
use bulletproofs::{BulletproofGens, GeneratorsChain, PedersenGens};
use curve25519_dalek::{ristretto::RistrettoPoint, scalar::Scalar};
use log::trace;
use logproof::{
    math::rand256,
    rings::{ZqSeal128_1024, ZqSeal128_2048, ZqSeal128_4096, ZqSeal128_8192},
    InnerProductVerifierKnowledge, LogProof, LogProofGenerators, LogProofProverKnowledge,
    LogProofVerifierKnowledge, ProofError,
};
use merlin::Transcript;
use paste::paste;
use seq_macro::seq;
use sunscreen_compiler_common::Type;
use sunscreen_zkp_backend::{
    bulletproofs::{
        BulletproofProverParameters, BulletproofVerifierParameters, BulletproofsBackend,
    },
    BigInt, Proof, ZkpBackend,
};

use crate::{CompiledZkpProgram, Result, TypeNameInstance, ZkpProgramInput, ZkpRuntime};

#[derive(Debug, Clone)]
/// SDLP proof and associated information for verification
pub struct Sdlp {
    proof: LogProof,
    vk: SealSdlpVerifierKnowledge,
    g: Vec<RistrettoPoint>,
    h: Vec<RistrettoPoint>,
    u: RistrettoPoint,
}

#[derive(Clone)]
/// R1CS BP proof and associated information for verification
struct BP {
    proof: Proof,
    verifier_parameters: BulletproofVerifierParameters,
}

#[derive(Clone)]
/// A linked proof between an SDLP and R1CS BP
pub struct LinkedProof {
    sdlp: Sdlp,
    bp: BP,
}

/// Errors that can occur when generating a linked SDLP and R1CS BP proof
#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum LinkedProofError {
    /// Error from the SDLP.
    #[error("SDLP proof error: {0:?}")]
    LogproofProofError(#[from] ProofError),

    /// The commitment to the shared inputs in the SDLP and R1CS BP do not match.
    #[error("Shared commitments are not equal")]
    SharedCommitmentsNotEqual,
}

/// Generate a set of generators for a single party where some of the
/// generators are shared with another proof system.
fn new_single_party_with_shared_generators(
    gens_capacity: usize,
    shared_generators: &[RistrettoPoint],
    insertion_point: usize,
    right_side_allocated: bool,
) -> BulletproofGens {
    let mut label = [b'G', 0, 0, 0, 0];
    let mut g = GeneratorsChain::new(&label)
        .take(gens_capacity)
        .collect::<Vec<RistrettoPoint>>();

    label[0] = b'H';
    let mut h = GeneratorsChain::new(&label)
        .take(gens_capacity)
        .collect::<Vec<RistrettoPoint>>();

    let mut index = insertion_point;
    let mut left_side = !right_side_allocated;

    // Insert the shared generators. Note that the order of the shared
    // generators is reversed because the inputs in the R1CS BP are reversed
    // after compilation.
    for gen in shared_generators.iter() {
        if left_side {
            g[index] = *gen;
            left_side = false;
            index -= 1;
        } else {
            h[index] = *gen;
            left_side = true;
        }
    }

    // We can unwrap safely because we know that the generators are generated properly.
    BulletproofGens::new_from_generators(vec![g], vec![h]).unwrap()
}

impl LinkedProof {
    const TRANSCRIPT_LABEL: &'static [u8] = b"linked-sdlp-and-r1cs-bp";
    /// This function creates a linked proof.
    ///
    /// Note that the [builder methods](`crate::LogProofBuilder`) offer an easier way to construct this
    /// proof. See the user documentation for more information.
    ///
    /// Arguments:
    /// * `prover_knowledge`: The SDLP prover knowledge
    /// * `shared_indices`: The indices of the shared values between the SDLP witness matrix `S`
    ///                     and the R1CS bulletproof
    /// * `shared_types`: The types of the shared values (which need not be the same length as the
    ///                   indices)
    /// * `program`: The compiled ZKP program to prove
    /// * `private_inputs`: The private inputs to the ZKP program, not including the shared values
    /// * `public_inputs`: The public inputs to the ZKP program
    /// * `constant_inputs`: The constant inputs to the ZKP program
    pub fn create<I>(
        prover_knowledge: &SealSdlpProverKnowledge,
        shared_indices: &[(usize, usize)],
        shared_types: &[Type],
        program: &CompiledZkpProgram,
        private_inputs: Vec<I>,
        public_inputs: Vec<I>,
        constant_inputs: Vec<I>,
    ) -> Result<Self>
    where
        I: Into<ZkpProgramInput> + Clone,
    {
        type Rt = ZkpRuntime<BulletproofsBackend>;
        let backend = BulletproofsBackend::new();
        let mut transcript = Transcript::new(Self::TRANSCRIPT_LABEL);

        let vk = prover_knowledge.vk();
        let shared_inputs_binary = shared_indices
            .iter()
            .map(|(i, j)| prover_knowledge.s_binary_by_index((*i, *j)))
            .collect::<Vec<BitVec>>();

        let gens = LogProofGenerators::new(vk.l() as usize);

        // Get shared generators
        let b_slices = vk.b_slices();
        let shared_gen_ranges = shared_indices
            .iter()
            .map(|(i, j)| b_slices[*i][*j].clone())
            .collect::<Vec<_>>();
        let shared_gens = shared_gen_ranges
            .iter()
            .flat_map(|range| gens.h[range.clone()].to_vec())
            .collect::<Vec<_>>();

        let u = PedersenGens::default().B_blinding;

        let half_rho = Scalar::from_bits(rand256());

        let sdlp_proof = prover_knowledge.create_shared_logproof(
            &mut transcript,
            &gens.g,
            &gens.h,
            &u,
            &half_rho,
            shared_indices,
        );

        let sdlp_package = Sdlp {
            proof: sdlp_proof,
            vk,
            g: gens.g,
            h: gens.h,
            u,
        };

        // Convert inputs into bigints
        let [private_inputs_bigint, public_inputs_bigint, constant_inputs_bigint] =
            <Rt>::collect_zkp_args_with(
                [private_inputs, public_inputs, constant_inputs],
                |inputs| {
                    let mut all_types = shared_types.to_owned();
                    all_types.extend(inputs.concat().into_iter().map(|i| i.type_name_instance()));
                    <Rt>::validate_arguments(&program.metadata.signature, &all_types)
                },
            )?;

        // Convert sharted inputs into bigints
        let shared_inputs_bigint = shared_inputs_binary.iter().flat_map(|shared_input_binary| {
            shared_input_binary.iter().map(|y| BigInt::from(*y as u8))
        });

        // Combine the shared & private inputs
        // Note: shared inputs _must_ come first. The proof linking logic depends on this.
        let private_inputs_bigint = shared_inputs_bigint
            .chain(private_inputs_bigint)
            .collect::<Vec<_>>();

        let metrics = backend.metrics(
            &program.zkp_program_fn,
            &private_inputs_bigint,
            &public_inputs_bigint,
            &constant_inputs_bigint,
        )?;

        let constraint_count = backend.constraint_count(
            &program.zkp_program_fn,
            &private_inputs_bigint,
            &public_inputs_bigint,
            &constant_inputs_bigint,
        )?;

        let bulletproof_gens = new_single_party_with_shared_generators(
            2 * constraint_count,
            &shared_gens.clone(),
            metrics.multipliers - 1,
            metrics.final_multiplier_rhs_allocated,
        );

        let verifier_parameters = BulletproofVerifierParameters::new(
            PedersenGens::default(),
            bulletproof_gens.clone(),
            shared_gens.len(),
        );

        let prover_parameters =
            BulletproofProverParameters::new(verifier_parameters.clone(), half_rho);

        trace!("Starting BP JIT (prover)...");
        let now = Instant::now();
        let prog = backend.jit_prover(
            &program.zkp_program_fn,
            &private_inputs_bigint,
            &public_inputs_bigint,
            &constant_inputs_bigint,
        )?;
        trace!("Prover BP JIT time {}s", now.elapsed().as_secs_f64());

        let inputs = [public_inputs_bigint, private_inputs_bigint].concat();

        trace!("Starting BP backend prove...");
        let now = Instant::now();
        let bp_proof =
            backend.prove_with_parameters(&prog, &inputs, &prover_parameters, &mut transcript)?;
        trace!("Prover BP time {}s", now.elapsed().as_secs_f64());

        let bp_package = BP {
            proof: bp_proof,
            verifier_parameters,
        };

        Ok(Self {
            sdlp: sdlp_package,
            bp: bp_package,
        })
    }

    /// This function verifies the linked proof.
    ///
    /// See the main documentation for more information and examples.
    ///
    /// Arguments:
    ///
    /// * `program`: The compiled ZKP program to verify
    /// * `public_inputs`: The public inputs to the ZKP program
    /// * `constant_inputs`: The constant inputs to the ZKP program
    ///
    pub fn verify<I>(
        &self,
        program: &CompiledZkpProgram,
        public_inputs: Vec<I>,
        constant_inputs: Vec<I>,
    ) -> Result<()>
    where
        I: Into<ZkpProgramInput> + Clone,
    {
        let runtime = ZkpRuntime::new(BulletproofsBackend::new())?;

        let mut transcript = Transcript::new(Self::TRANSCRIPT_LABEL);

        self.sdlp
            .vk
            .verify(
                &self.sdlp.proof,
                &mut transcript,
                &self.sdlp.g,
                &self.sdlp.h,
                &self.sdlp.u,
            )
            .map_err(LinkedProofError::LogproofProofError)?;

        runtime.verify_with_parameters(
            program,
            &self.bp.proof,
            public_inputs,
            constant_inputs,
            &self.bp.verifier_parameters,
            &mut transcript,
        )?;

        if let Proof::Bulletproofs(ref b) = self.bp.proof {
            let b = b.clone();
            let a_i1_shared = (*b).0.A_I1_shared();

            if a_i1_shared != self.sdlp.proof.w_shared.compress() {
                return Err(LinkedProofError::SharedCommitmentsNotEqual.into());
            }
        }

        Ok(())
    }
}

impl Sdlp {
    const TRANSCRIPT_LABEL: &'static [u8] = b"solo-sdlp";
    /// This function creates a singular SDLP, not linked to any other proof system. This can be
    /// used when only proving valid encryptions of known values, but _not_ for proving any
    /// properties of those underlying values.
    ///
    /// The [builder methods](`crate::LogProofBuilder`) offer an easier way to construct this proof.
    pub fn create(prover_knowledge: &SealSdlpProverKnowledge) -> Result<Self> {
        let mut transcript = Transcript::new(Self::TRANSCRIPT_LABEL);
        let vk = prover_knowledge.vk();
        let gen = LogProofGenerators::new(vk.l() as usize);
        let u = InnerProductVerifierKnowledge::get_u();
        let proof = prover_knowledge.create_logproof(&mut transcript, &gen.g, &gen.h, &u);

        Ok(Self {
            proof,
            vk,
            g: gen.g,
            h: gen.h,
            u,
        })
    }

    /// This function verifies a solo SDLP.
    pub fn verify(&self) -> Result<()> {
        let mut transcript = Transcript::new(Self::TRANSCRIPT_LABEL);

        self.vk
            .verify(&self.proof, &mut transcript, &self.g, &self.h, &self.u)?;

        Ok(())
    }
}

/// The prover knowledge of an [`Sdlp`].
pub struct SealSdlpProverKnowledge(pub(crate) SealSdlpProverKnowledgeInternal);

/// The verifier knowledge of an [`Sdlp`].
#[derive(Debug, Clone)]
pub struct SealSdlpVerifierKnowledge(pub(crate) SealSdlpVerifierKnowledgeInternal);

pub(crate) enum SealSdlpProverKnowledgeInternal {
    LP1(LogProofProverKnowledge<ZqSeal128_1024>),
    LP2(LogProofProverKnowledge<ZqSeal128_2048>),
    LP3(LogProofProverKnowledge<ZqSeal128_4096>),
    LP4(LogProofProverKnowledge<ZqSeal128_8192>),
}

#[derive(Debug, Clone)]
pub(crate) enum SealSdlpVerifierKnowledgeInternal {
    LP1(LogProofVerifierKnowledge<ZqSeal128_1024>),
    LP2(LogProofVerifierKnowledge<ZqSeal128_2048>),
    LP3(LogProofVerifierKnowledge<ZqSeal128_4096>),
    LP4(LogProofVerifierKnowledge<ZqSeal128_8192>),
}

macro_rules! impl_from {
    ($zq_type:ty, $variant:ident) => {
        paste! {
            impl From<LogProofProverKnowledge<$zq_type>> for SealSdlpProverKnowledge {
                fn from(k: LogProofProverKnowledge<$zq_type>) -> Self {
                    Self(SealSdlpProverKnowledgeInternal::$variant(k))
                }
            }
            impl From<LogProofVerifierKnowledge<$zq_type>> for SealSdlpVerifierKnowledge {
                fn from(k: LogProofVerifierKnowledge<$zq_type>) -> Self {
                    Self(SealSdlpVerifierKnowledgeInternal::$variant(k))
                }
            }
        }
    };
}

impl_from!(ZqSeal128_1024, LP1);
impl_from!(ZqSeal128_2048, LP2);
impl_from!(ZqSeal128_4096, LP3);
impl_from!(ZqSeal128_8192, LP4);

macro_rules! seq_zq {
    ($block:tt) => (
        seq!(N in 1..=4 {
            $block
        })
    )
}

impl SealSdlpProverKnowledge {
    /// Get the binary expansion of a component of the witness matrix `S`.
    ///
    /// Delegation to [`LogProofProverKnowledge::s_binary_by_index`].
    pub fn s_binary_by_index(&self, index: (usize, usize)) -> BitVec {
        seq_zq!({
            match &self.0 {
                #(
                    SealSdlpProverKnowledgeInternal::LP~N(pk) => pk.s_binary_by_index(index),
                )*
            }
        })
    }

    /// Get the verifier knowledge component.
    ///
    /// Delegation to [`LogProofProverKnowledge::vk`].
    pub fn vk(&self) -> SealSdlpVerifierKnowledge {
        seq_zq!({
            match &self.0 {
                #(
                    SealSdlpProverKnowledgeInternal::LP~N(pk) => {
                        SealSdlpVerifierKnowledge(SealSdlpVerifierKnowledgeInternal::LP~N(pk.vk.clone()))
                    }
                )*
            }
        })
    }

    /// Create a shared `LogProof`.
    ///
    /// Delegation to [`LogProof::create_with_shared`].
    pub fn create_shared_logproof(
        &self,
        transcript: &mut Transcript,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
        half_rho: &Scalar,
        shared_indices: &[(usize, usize)],
    ) -> LogProof {
        seq_zq!({
            match &self.0 {
                #(
                    SealSdlpProverKnowledgeInternal::LP~N(pk) => {
                        LogProof::create_with_shared(transcript, pk, g, h, u, half_rho, shared_indices)
                    }
                )*
            }
        })
    }

    /// Create a `LogProof` without sharing.
    ///
    /// Delegation to [`LogProof::create`].
    pub fn create_logproof(
        &self,
        transcript: &mut Transcript,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> LogProof {
        seq_zq!({
            match &self.0 {
                #(
                    SealSdlpProverKnowledgeInternal::LP~N(pk) => LogProof::create(transcript, pk, g, h, u),
                )*
            }
        })
    }
}

impl SealSdlpVerifierKnowledge {
    /// Get the length in bits of the binary expansion of the serialized secret * vectors.
    ///
    /// Delegate to [`LogProofVerifierKnowledge::l`].
    pub fn l(&self) -> u64 {
        seq_zq!({
            match &self.0 {
                #(
                    SealSdlpVerifierKnowledgeInternal::LP~N(vk) => vk.l(),
                )*
            }
        })
    }

    /// Get the ranges in the serialized coefficients of `S` corresponding to the bounds
    ///
    /// Delegate to [`LogProofVerifierKnowledge::b_slices`].
    pub fn b_slices(&self) -> Vec<Vec<Range<usize>>> {
        seq_zq!({
            match &self.0 {
                #(
                    SealSdlpVerifierKnowledgeInternal::LP~N(vk) => vk.b_slices(),
                )*
            }
        })
    }

    /// Verify the log proof.
    ///
    /// Delegate to [`LogProof::verify`].
    pub fn verify(
        &self,
        logproof: &LogProof,
        transcript: &mut Transcript,
        g: &[RistrettoPoint],
        h: &[RistrettoPoint],
        u: &RistrettoPoint,
    ) -> Result<(), ProofError> {
        seq_zq!({
            match &self.0 {
                #(
                    SealSdlpVerifierKnowledgeInternal::LP~N(vk) => logproof.verify(transcript, vk, g, h, u),
                )*
            }
        })
    }
}
