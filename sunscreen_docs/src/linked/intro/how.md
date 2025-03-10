# How does this work?

This chapter is not a prerequisite to using our linked compilers, but may be of
interest for anyone curious what's going on under the hood.

# Linked SDLP and R1CS proofs

A linked proof consists of a short discrete log proof (SDLP) and an R1CS bulletproof (BP). It allows you to simultaneously prove an encryption is valid (SDLP) and that the encrypted message has some property (BP). Specifically, the SDLP proves a linear relation while keeping part of that relation secret, while BPs enables proving arbitrary arithmetic circuits, which can be used to prove that a secret satisfies some property. For example, one can prove that a private transaction can occur because the sender has enough funds to cover the transaction, without revealing what the transaction is or what their current balance is. This combination of proof systems is powerful because we can now operate on encrypted data using FHE while ensuring the encrypted data doesn't violate any properties of the system of interest such as a negative balance.

How does this work in practice? The sunscreen library provides a [`LinkedProofBuilder`](/linked/runtime/prove.md) that allows you to encrypt messages in a very similar way to our typical [`FheRuntime::encrypt`](/fhe/fhe_programs/runtime/encryption.md), while also opting to _link_ a message as an input to a ZKP program. Under the hood, we'll handle the complicated bits of generating the SDLP and sharing the secrets with the ZKP program.

# The nitty gritty

The SDLP proves linear equations of the form \\( A \cdot S = T \\), where \\(A\\) and \\(T\\) are public information, while \\(S\\) is only known by the prover. The BFV equations can be written in this linear form, where the message and associated randomness from encryption can be contained in the private \\(S\\) matrix.

In order to link this to BPs, we pass the values in \\(S\\) that the user would like to link with BPs as inputs to the BPs circuit. If one just does this without any other modifications, the result is not secure as there is not a guarantee that the inputs to the SDLP were the same as the inputs to the BP. To rectify this, we form commitments to the parts of \\(S\\) that are shared between SDLP and BPs and check that the inputs that are linked between the two proof systems produce the same commitment. 

Written out in steps, we perform the following as a prover:

1. Generate a SDLP that the user requested. The parts of \\(S\\) that the user would like to link between SDLP and BPs are committed to, and these values and the associated generators are stored by the prover.
2. The prover passes the inputs and generators to BPs.
3. The SDLP and BP proofs are stored together, along with the commitment to the linked inputs.

A verifier will then perform the following steps:

1. The verifier will run the SDLP verification with the public inputs \\(A\\) and \\(T\\) and verify the result. As part of this process, a commitment to the linked inputs is derived.
2. The verifier will run the BP verification with its public inputs and verify the result. As part of this process, a commitment to the linked inputs is derived.
3. The verifier checks that the commitments generated in the prior steps match.
