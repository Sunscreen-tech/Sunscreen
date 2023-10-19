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

/// SDLP proof and associated information for verification
pub struct Sdlp<Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord> {
    proof: LogProof,
    vk: LogProofVerifierKnowledge<Q>,
    g: Vec<RistrettoPoint>,
    h: Vec<RistrettoPoint>,
    u: RistrettoPoint,
}

/// R1CS BP proof and associated information for verification
struct BP {
    proof: Proof,
    verifier_parameters: BulletproofVerifierParameters,
}

/// Linked proof between a SDLP and R1CS BP
pub struct LinkedProof<Q: Ring + CryptoHash + ModSwitch<ZqRistretto> + RingModulus<4> + Ord> {
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
     * This function creates a linked proof between a short discrete log proof
     * (SDLP) and a R1CS bulletproof. An example use case is proving an
     * encryption is valid (by SDLP) and that the encrypted message has some
     * property (by R1CS Bulletproof).
     *
     * The SDLP is used to prove a linear relation while keeping part of that
     * relation secret. Specifically, the SDLP allows one to prove a matrix
     * relation of the form A * S = T, where S is a matrix of secrets (sometimes
     * also called a witness) and T is the result of computing A on that secret.
     * An example relation is the equation for encryption in BFV, which can be
     * used to show that a ciphertext is a valid encryption of some underlying
     * message instead of a random value.
     *
     * R1CS bulletproofs enable proving arbitrary arithmetic circuits, which can
     * be used to prove that some secret satisfies some property. For example,
     * one can prove that a private transaction can occur because the sender has
     * enough funds to cover the transaction, without revealing what the
     * transaction is.
     *
     * Combining these two proofs is powerful because it allows one to prove
     * both that a ciphertext is a valid encryption of some message and that the
     * message satisfies some property. In the prior example of a private
     * transaction, with a linked proof we can now prove that the sender knows
     * the value in an encrypted transaction and that the sender has enough
     * funds to cover the transaction, without decrypting the transaction.
     *
     * How does this work in practice? We will first generate a lattice problem
     * of the form A * S = T and then specify what parts of S are shared with
     * the ZKP program. We then specify the remaining private inputs to the ZKP
     * program, the public inputs to the ZKP, and the constant inputs to the
     * ZKP.
     *
     * __Important note__: The compiled program must have the linked parts as
     * the first arguments, and then the private inputs, public inputs, and
     * constant inputs.
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
     *
     * Example:
     *
     * Let's perform a transaction where the transaction amount is private and
     * the balance is public. We want to prove that the transaction is valid
     * (i.e. the transaction amount is less than or equal to the balance)
     * without revealing the transaction amount.
     *
     * Let's first tackle the SDLP to show that we can generate a valid
     * encryption of a message. The BFV encryption equation in SEAL is
     *
     * ```text
     * (c_0, c_1) = (delta * m + r + p_0 * u + e_1, p_1 * u + e_2)
     * ```
     *
     * where
     *
     * * `delta` is a constant polynomial with floor(q/t) as it's DC component. q is
     *   the coefficient modulus and t is the plain modulus,
     * * `m` is the polynomial plaintext message to encrypt,
     * * `r` is a rounding polynomial proportional to m with coefficients in the
     *   range [0, t],
     * * p_0 and p_1 are the public key polynomials,
     * * `u` is a random ternary polynomial,
     * * `e_1` and `e_2` are random polynomials sampled from the centered binomial
     *   distribution, and
     * * `c_0` and `c_1` are the ciphertext polynomials.
     *
     * This can be implemented as a linear relation as follows.
     *
     * ```text
     * A = [ delta, 1, p_0, 1, 0
     *         0  , 0, p_1, 0, 1 ]
     * S = [ m, r, u, e_1, e_2, ]^T
     * T = [ c_0, c_1, ] ^ T
     * ```
     *
     * To perform the SDLP, we will need to specify the bounds for each coefficient
     * of each element of S. In the case where we encode m as a constant polynomial
     * (ie the plaintext is a constant in the DC coefficient and zero for all other
     * coefficients), the bounds for m are `[t, 0, ..., 0]`, while the bounds for
     * the other components are based on their respective distributions.
     *
     * ```
     * // Information needed to define a SDLP lattice problem.
     * struct LatticeProblem {
     *  a: Matrix<Polynomial>,
     *  s: Matrix<Polynomial>,
     *  t: Matrix<Polynomial>,
     *  f: Polynomial,
     *  b: Matrix<Bounds>,
     * }
     *
     * // Generate a lattice problem for A * S = T (mod f). The bounds for each
     * // coefficient of each element of S are calculated in the function.
     * let lattice_problem: LatticeProblem = Seal_BFV_encrytion(plaintext, degree, plain_modulus);
     *
     * // This can then be passed to the SDLP to generate a proof if desired.
     * ```
     *
     * The second proof we would like to show is that the encrypted value is less
     * than some balance. We can do that using the Sunscreen compiler and the
     * following ZKP.
     *
     * ```
     * #[zkp_program]
     * fn valid_transaction<F: FieldSpec>(
     *     #[private] transaction_binary: [Field<F>; 15],
     *     #[public] balance: Field<F>
     * ) {
     *     let lower_bound = zkp_var!(0);
     *
     *     // Reconstruct the transaction amount from the message polynomial
     *     // binary expansion.
     *     let transaction = from_twos_complement_field_element(
     *       transaction_binary
     *     );
     *
     *     // Constraint that transaction is less than or equal to balance
     *     balance.constrain_ge_bounded(transaction, 64);
     *
     *     // Constraint that transaction is greater than or equal to zero
     *     lower_bound.constrain_le_bounded(transaction, 64);
     * }
     * ```
     *
     * Interestingly the transaction amount is not specified as a number but in its
     * twos complement binary representation. This is because in the SDLP, the
     * message polynomial is expanded into its twos complement binary and then used
     * as an input to the proof. In order to link the SDLP and the ZKP program, we
     * will be sharing this binary expansion between the two proof systems. This
     * means that in the ZKP, we will need to convert the binary expanded message
     * polynomial back into something meaningful for us. In this particular example
     * (a constant polynomial message with bounds on the DC component only), we can
     * use this helper function to reconstitute the transaction amount.
     *
     * ```
     * fn from_twos_complement_field_element<F: FieldSpec, const N: usize>(
     *     x: [ProgramNode<Field<F>>; N],
     * ) -> ProgramNode<Field<F>> {
     *     let mut x_recon = zkp_var!(0);
     *
     *     for (i, x_i) in x.iter().enumerate().take(N - 1) {
     *         x_recon = x_recon + (zkp_var!(2i64.pow(i as u32)) * (*x_i));
     *     }
     *
     *     x_recon = x_recon + zkp_var!(-(2i64.pow((N - 1) as u32))) * x[N - 1];
     *
     *     x_recon
     * }
     * ```
     *
     * With all of these pieces, we can use the `linked_proof` function to generate
     * a proof that the encrypted transaction amount is less than or equal to the
     * balance.
     *
     * ```
     * let app = Compiler::new()
     *     .zkp_backend::<BulletproofsBackend>()
     *     .zkp_program(valid_transaction)
     *     .compile()?;
     *
     * let valid_transaction_zkp = app.get_zkp_program(valid_transaction).unwrap();
     *
     * let transaction = 11999u64;
     * let balance = 12200u64;
     *
     * let lattice_problem = test_seal_linear_relation::<SealQ128_1024, 1>(
     *     transaction, 1024, 12289
     * );
     *
     * // This means we only care about S[(0, 0)], which is `m` in the BFV encryption.
     * let shared_indices = vec![(0, 0)];
     *
     * println!("Performing linked proof");
     * let lp: LinkedProof = linked_proof(
     *     &lattice_problem,
     *     &shared_indices,
     *     valid_transaction_zkp,
     *     &[],                                 // Additional private inputs
     *     &[BulletproofsField::from(balance)], // Public inputs
     *     &[],                                 // Constant inputs
     * );
     * println!("Linked proof done");
     * ```
     *
     * This will generate an proof of type `LinkedProof` that can be verified as follows:
     *
     * ```
     * println!("Performing linked verify");
     * let verified = linked_verify(
     *     &lp,
     *     valid_transaction_zkp,
     *     vec![BulletproofsField::from(balance)], // Public inputs
     *     vec![],                                 // Constant inputs
     * );
     * println!("Verified linked proof: {}", verified);
     * ```
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
     * See [`linked_proof`] for more details and an example use.
     *
     * Arguments:
     *
     * * `lp`: The linked proof to verify
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

#[cfg(test)]
mod tests {

    use crate::LinkedProof;
    use logproof::test::seal_bfv_encryption_linear_relation;
    use sunscreen::{
        bulletproofs::BulletproofsBackend,
        types::zkp::{BulletproofsField, ConstrainCmp, Field, FieldSpec, ProgramNode},
        zkp_program, zkp_var, Compiler,
    };

    use logproof::rings::SealQ128_1024;

    /// Convert a twos complement represented signed integer into a field element.
    fn from_twos_complement_field_element<F: FieldSpec, const N: usize>(
        x: [ProgramNode<Field<F>>; N],
    ) -> ProgramNode<Field<F>> {
        let mut x_recon = zkp_var!(0);

        for (i, x_i) in x.iter().enumerate().take(N - 1) {
            x_recon = x_recon + (zkp_var!(2i64.pow(i as u32)) * (*x_i));
        }

        x_recon = x_recon + zkp_var!(-(2i64.pow((N - 1) as u32))) * x[N - 1];

        x_recon
    }

    #[zkp_program]
    fn valid_transaction<F: FieldSpec>(#[private] x: [Field<F>; 15], #[public] balance: Field<F>) {
        let lower_bound = zkp_var!(0);

        // Reconstruct x from the bag of bits
        let x_recon = from_twos_complement_field_element(x);

        // Constraint that x is less than or equal to balance
        balance.constrain_ge_bounded(x_recon, 64);

        // Constraint that x is greater than or equal to zero
        lower_bound.constrain_le_bounded(x_recon, 64);
    }

    #[test]
    fn test_valid_transaction() {
        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(valid_transaction)
            .compile()
            .unwrap();

        let valid_transaction_zkp = app.get_zkp_program(valid_transaction).unwrap();

        let x = 11999u64;
        let balance = 12200u64;

        let lattice_problem =
            seal_bfv_encryption_linear_relation::<SealQ128_1024, 1>(x, 1024, 12289, false);
        let shared_indices = vec![(0, 0)];

        println!("Performing linked proof");
        let lp = LinkedProof::create(
            &lattice_problem,
            &shared_indices,
            valid_transaction_zkp,
            vec![],
            vec![BulletproofsField::from(balance)],
            vec![],
        )
        .unwrap();
        println!("Linked proof done");

        println!("Performing linked verify");
        lp.verify(
            valid_transaction_zkp,
            vec![BulletproofsField::from(balance)],
            vec![],
        )
        .expect("Failed to verify linked proof");
        println!("Linked verify done");
    }
}
