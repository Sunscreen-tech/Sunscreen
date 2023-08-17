# FHE Programs

Now, we're going to get into the anatomy of an FHE program, what they can and can't do, and best practices for maximizing code re-use.

You write FHE programs in Sunscreen's domain-specific language (DSL) built within Rust. Leveraging an existing ecosystem in this way provides many synergies; you can consume and share FHE programs/subroutines with Cargo's package manager, no new syntax to learn, and how one expresses FHE programs can evolve with the Rust language.
