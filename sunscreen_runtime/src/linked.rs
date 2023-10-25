// For tests, see the sunscreen crate.

use bitvec::vec::BitVec;
use bulletproofs::{BulletproofGens, GeneratorsChain, PedersenGens};
use curve25519_dalek::{ristretto::RistrettoPoint, scalar::Scalar};
use logproof::{crypto::CryptoHash, math::ModSwitch, LogProofVerifierKnowledge, ProofError};
use merlin::Transcript;
use sunscreen_math::ring::{Ring, RingModulus};
use sunscreen_zkp_backend::{
    bulletproofs::{
        BulletproofProverParameters, BulletproofVerifierParameters, BulletproofsBackend,
    },
    BigInt, CompiledZkpProgram, Proof, ZkpBackend,
};

use logproof::{
    math::rand256, rings::ZqRistretto, LatticeProblem, LogProof, LogProofGenerators,
    LogProofProverKnowledge,
};

use crate::{ZkpProgramInput, ZkpRuntime};

#[derive(Debug, Clone)]
/// SDLP proof and associated information for verification
pub struct Sdlp<Q>
where
    Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord + Clone,
{
    proof: LogProof,
    vk: LogProofVerifierKnowledge<Q>,
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
/// Linked proof between a SDLP and R1CS BP
pub struct LinkedProof<Q>
where
    Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord + Clone,
{
    sdlp: Sdlp<Q>,
    bp: BP,
}

/// Errors that can occur when generating a linked SDLP and R1CS BP proof
#[derive(Debug, Clone, thiserror::Error)]
pub enum LinkedProofError {
    /// An error with the ZKP proving.
    #[error(transparent)]
    ZkpError(sunscreen_zkp_backend::Error),

    /// An error generating the runtime.
    #[error(transparent)]
    SunscreenRuntimeError(crate::Error),

    /// Error from the SDLP.
    #[error("SDLP proof error: {0:?}")]
    LogproofProofError(ProofError),

    /// The commitment to the shared inputs in the SDLP and R1CS BP do not match.
    #[error("Shared commitments are not equal")]
    SharedCommitmentsNotEqual,
}

impl From<sunscreen_zkp_backend::Error> for LinkedProofError {
    fn from(err: sunscreen_zkp_backend::Error) -> Self {
        LinkedProofError::ZkpError(err)
    }
}

impl From<crate::Error> for LinkedProofError {
    fn from(err: crate::Error) -> Self {
        LinkedProofError::SunscreenRuntimeError(err)
    }
}

impl From<ProofError> for LinkedProofError {
    fn from(err: ProofError) -> Self {
        LinkedProofError::LogproofProofError(err)
    }
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

impl<Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord> LinkedProof<Q> {
    /**
     * This function verifies a linked proof between a short discrete log proof
     * (SDLP) and a R1CS bulletproof. An example use case is proving an encryption
     * is valid (by SDLP) and that the encrypted message has some property (by R1CS
     * Bulletproof).
     *
     * See the main documentation for more information.
     *
     * Arguments:
     *
     * * `lattice_problem`: The lattice problem to prove
     * * `shared_indices`: The indices of the shared values between the SDLP and the
     *                     R1CS bulletproof
     * * `program`: The compiled ZKP program to prove
     * * `private_inputs`: The private inputs to the ZKP program, not including the
     *                     shared values
     * * `public_inputs`: The public inputs to the ZKP program
     * * `constant_inputs`: The constant inputs to the ZKP program
     */
    pub fn create<I>(
        lattice_problem: &LatticeProblem<Q>,
        shared_indices: &[(usize, usize)],
        program: &CompiledZkpProgram,
        private_inputs: Vec<I>,
        public_inputs: Vec<I>,
        constant_inputs: Vec<I>,
    ) -> Result<Self, sunscreen_zkp_backend::Error>
    where
        I: Into<ZkpProgramInput> + Clone,
    {
        let backend = BulletproofsBackend::new();
        let mut transcript = Transcript::new(b"linked-sdlp-and-r1cs-bp");

        let pk = LogProofProverKnowledge::new(
            &lattice_problem.a,
            &lattice_problem.s,
            &lattice_problem.t,
            &lattice_problem.b,
            &lattice_problem.f,
        );

        let binary_parts = shared_indices
            .iter()
            .map(|(i, j)| pk.s_binary_by_index((*i, *j)))
            .collect::<Vec<BitVec>>();

        let gens = LogProofGenerators::new(pk.vk.l() as usize);

        // Get shared generators
        let b_slices = pk.vk.b_slices();
        let shared_gens = shared_indices
            .iter()
            .flat_map(|(i, j)| {
                let range = (b_slices[*i][*j]).clone();
                gens.h[range].to_vec()
            })
            .collect::<Vec<RistrettoPoint>>();

        let u = PedersenGens::default().B_blinding;

        let half_rho = Scalar::from_bits(rand256());

        let sdlp_proof = LogProof::create_with_shared(
            &mut transcript,
            &pk,
            &gens.g,
            &gens.h,
            &u,
            &half_rho,
            shared_indices,
        );

        let sdlp_package = Sdlp {
            proof: sdlp_proof,
            vk: pk.vk,
            g: gens.g,
            h: gens.h,
            u,
        };

        let private_inputs_zkp_input: Vec<ZkpProgramInput> = private_inputs
            .iter()
            .map(|input| I::into(input.clone()))
            .collect::<Vec<_>>();
        let public_inputs_zkp_input: Vec<ZkpProgramInput> = public_inputs
            .iter()
            .map(|input| I::into(input.clone()))
            .collect::<Vec<_>>();
        let constant_inputs_zkp_input: Vec<ZkpProgramInput> = constant_inputs
            .iter()
            .map(|input| I::into(input.clone()))
            .collect::<Vec<_>>();

        let private_inputs_bigint: Vec<BigInt> = private_inputs_zkp_input
            .iter()
            .flat_map(|input| input.0.to_native_fields())
            .collect::<Vec<_>>();
        let public_inputs_bigint: Vec<BigInt> = public_inputs_zkp_input
            .iter()
            .flat_map(|input| input.0.to_native_fields())
            .collect::<Vec<_>>();
        let constant_inputs_bigint: Vec<BigInt> = constant_inputs_zkp_input
            .iter()
            .flat_map(|input| input.0.to_native_fields())
            .collect::<Vec<_>>();

        // Prepend the bigint representations of our binary bits
        let private_inputs_bigint = binary_parts
            .iter()
            .flat_map(|x| x.iter().map(|y| BigInt::from(*y as u64)))
            .chain(private_inputs_bigint)
            .collect::<Vec<_>>();

        let metrics = backend.metrics(
            program,
            &private_inputs_bigint,
            &public_inputs_bigint,
            &constant_inputs_bigint,
        )?;

        let constraint_count = backend.constraint_count(
            program,
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

        let prog = backend.jit_prover(
            program,
            &private_inputs_bigint,
            &public_inputs_bigint,
            &constant_inputs_bigint,
        )?;

        let inputs = [public_inputs_bigint, private_inputs_bigint].concat();

        let bp_proof =
            backend.prove_with_parameters(&prog, &inputs, &prover_parameters, &mut transcript)?;

        let bp_package = BP {
            proof: bp_proof,
            verifier_parameters,
        };

        Ok(Self {
            sdlp: sdlp_package,
            bp: bp_package,
        })
    }

    /**
     * This function verifies a linked proof between a short discrete log proof
     * (SDLP) and a R1CS bulletproof. An example use case is proving an encryption
     * is valid (by SDLP) and that the encrypted message has some property (by R1CS
     * Bulletproof).
     *
     * See the main documentation for more information and examples.
     *
     * Arguments:
     *
     * * `program`: The compiled ZKP program to verify
     * * `public_inputs`: The public inputs to the ZKP program
     * * `constant_inputs`: The constant inputs to the ZKP program
     */
    pub fn verify<I>(
        &self,
        program: &CompiledZkpProgram,
        public_inputs: Vec<I>,
        constant_inputs: Vec<I>,
    ) -> Result<(), LinkedProofError>
    where
        I: Into<ZkpProgramInput> + Clone,
    {
        let runtime = ZkpRuntime::new(BulletproofsBackend::new())?;

        let mut transcript = Transcript::new(b"linked-sdlp-and-r1cs-bp");

        self.sdlp.proof.verify(
            &mut transcript,
            &self.sdlp.vk,
            &self.sdlp.g,
            &self.sdlp.h,
            &self.sdlp.u,
        )?;

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
                return Err(LinkedProofError::SharedCommitmentsNotEqual);
            }
        }

        Ok(())
    }
}
