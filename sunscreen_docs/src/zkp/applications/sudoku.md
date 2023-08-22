# Sudoku

We'll now walk through a less trivial proof in which we prove that we have a
valid Sudoku solution, without revealing what the solution is. 

Recall Sudoku is a 9x9 grid in which:

- Each of the 9 rows must contain the numbers \\(1, \ldots, 9\\).
- Each of the 9 columns must contain the numbers \\(1, \ldots, 9\\).
- Each of the 3x3 sub-squares must contain the numbers \\(1, \ldots, 9\\).

The user will be given a starting grid with some numbers filled in and those numbers
must remain the same in their solution.

## How will our algorithm work?

This example is a bit more complicated in terms of translating conditions the private inputs need to satisfy into constraints. 
As we'll make extensive use of polynomials and polynomial evaluation, we recommend making sure you're comfortable with the [previous example](./allowlist.md) before diving into this section.

At a high level, we need to take a set \\(S\\) of 9 squares and prove that the set is precisely the numbers 1 through 9.

For each of these sets \\(S\\), our strategy will be as follows: for each of the numbers \\(i \in \\{1, \ldots, 9\\}\\), construct a polynomial \\( p = \prod_{s \in S} (i - s) \\) and constrain \\( p = 0 \\). This proves that each \\(i \in S\\), and since \\(S\\) is a set of size 9, it proves that \\(S = \\{1, \ldots, 9 \\}\\).


## Program walkthrough

Let's look at how to implement this.

### Setup

We'll start with the necessary imports.

```rust
use sunscreen::{
    bulletproofs::BulletproofsBackend,
    types::zkp::{BulletproofsField, Field, FieldSpec},
    zkp_program, zkp_var, Error, ZkpProgramFnExt
};
```

### Arguments

Next, we need to choose how to represent the board and the solution.
[Arrays](../zkp_programs/types.md#arrays) are a natural choice.

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Error, ZkpProgramFnExt
# };
#[zkp_program]
fn sudoku_proof<F: FieldSpec>(
    solution: [[Field<F>; 9]; 9], // no attribute specified so this is private by default
    #[public] board: [[Field<F>; 9]; 9],
) { }
```
We'll let a zero in the starting board represent an empty square that the
solution has to fill in.

We declare `sudoku_proof` as a ZKP program with the appropriate attribute (`#[zkp_program]`). Under the hood, we're actually working over a [field](../intro/prereq.md) in our ZKP program so we need to specify that the given `board` and provided `solution` contain fields elements (using `Field`).

The board will need to be viewable to both the prover and verifier (which is why we use `#[public]`) whereas the solution will be kept private to the prover. 

### Set equality constraints

Notice we have a common constraint that a set of nine numbers is precisely the
set \\(\\{1, \ldots, 9\\}\\). Since our ZKP programs are just normal Rust
functions, we have the full power of the Rust programming language at our
disposal! So, let's make a function to reuse for each set of numbers that needs
to satisfy this constraint.

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Error, ZkpProgramFnExt
# };
#[zkp_program]
fn sudoku_proof<F: FieldSpec>(
    solution: [[Field<F>; 9]; 9],
    #[public] board: [[Field<F>; 9]; 9],
) {
    let zero = zkp_var!(0);

    let assert_unique_numbers = |squares| {
        for i in 1..=9 {
            let mut circuit = zkp_var!(1);
            for s in squares {
                circuit = circuit * (zkp_var!(i) - s);
            }
            circuit.constrain_eq(zero);
        }
    };
# // N.B. below is just here for constraining type of closure above
#     for row in solution {
#         assert_unique_numbers(row);
#     }
}
```

For each number in \\(1, \ldots, 9\\), we'll need to verify that number is indeed on the list of
`squares`. If `squares` is an array of length nine, this shows set equality!

Since we need to create field elements within our ZKP program `sudoku_proof`, we make use of `zkp_var` for 0 and 1...9.

To require `circuit` to be equal to `zero`, we need to specify an equality constraint (done using `constrain_eq`). Again, we see that constraining a polynomial to equal zero is a very useful pattern.

All that's left now is to make sure our function satisfies the bulletpoints mentioned in the intro.

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Error, ZkpProgramFnExt
# };
#[zkp_program]
fn sudoku_proof<F: FieldSpec>(
    solution: [[Field<F>; 9]; 9],
    #[public] board: [[Field<F>; 9]; 9],
) {
    let zero = zkp_var!(0);

    let assert_unique_numbers = |squares| {
        for i in 1..=9 {
            let mut circuit = zkp_var!(1);
            for s in squares {
                circuit = circuit * (zkp_var!(i) - s);
            }
            circuit.constrain_eq(zero);
        }
    };

    // Checks rows contain every number from 1 to 9
    for row in solution {
        assert_unique_numbers(row);
    }

    // Checks columns contain each number from 1 to 9
    for col in 0..9 {
        let column = solution.map(|r| r[col]);
        assert_unique_numbers(column);
    }

    // Checks squares contain each number from 1 to 9
    for i in 0..3 {
        for j in 0..3 {
            let rows = &solution[(i * 3)..(i * 3 + 3)];

            let square = rows.iter().map(|s| &s[(j * 3)..(j * 3 + 3)]);

            let flattened_sq = square
                .flatten()
                .copied()
                .collect::<Vec<_>>()
                .try_into()
                .unwrap_or([zero; 9]);

            assert_unique_numbers(flattened_sq);
        }
    }
}
```


### Starting board constraints
The final part of proving we have a valid Sudoku solution is making sure that the solution
sticks to the starting board constraints.

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Error, ZkpProgramFnExt
# };
# #[zkp_program]
# fn sudoku_proof<F: FieldSpec>(
#     solution: [[Field<F>; 9]; 9],
#     #[public] board: [[Field<F>; 9]; 9],
# ) {
#     let zero = zkp_var!(0);
// Proves that the solution matches up with the puzzle where applicable
for i in 0..9 {
    for j in 0..9 {
        let square = solution[i][j];
        let constraint = board[i][j];
        (constraint * (constraint - square)).constrain_eq(zero);
    }
}
# }
```

Here, we're using the fact that \\(a \cdot b = 0\\) implies \\(a = 0\\) or \\(b
= 0\\). This implies that each square in the starting board was either filled in
or remains the same in the solution.

### Prove and verify

Let's see this in action!

```rust
# use sunscreen::{
#     bulletproofs::BulletproofsBackend,
#     types::zkp::{BulletproofsField, Field, FieldSpec},
#     zkp_program, zkp_var, Error, ZkpProgramFnExt
# };
# 
# #[zkp_program]
# fn sudoku_proof<F: FieldSpec>(
#     solution: [[Field<F>; 9]; 9],
#     #[public] board: [[Field<F>; 9]; 9],
# ) {
#     let zero = zkp_var!(0);
# 
#     let assert_unique_numbers = |squares| {
#         for i in 1..=9 {
#             let mut circuit = zkp_var!(1);
#             for s in squares {
#                 circuit = circuit * (zkp_var!(i) - s);
#             }
#             circuit.constrain_eq(zero);
#         }
#     };
# 
#     // Checks rows contain every number from 1 to 9
#     for row in solution {
#         assert_unique_numbers(row);
#     }
# 
#     // Checks columns contain each number from 1 to 9
#     for col in 0..9 {
#         let column = solution.map(|r| r[col]);
#         assert_unique_numbers(column);
#     }
# 
#     // Checks squares contain each number from 1 to 9
#     for i in 0..3 {
#         for j in 0..3 {
#             let rows = &solution[(i * 3)..(i * 3 + 3)];
# 
#             let square = rows.iter().map(|s| &s[(j * 3)..(j * 3 + 3)]);
# 
#             let flattened_sq = square
#                 .flatten()
#                 .copied()
#                 .collect::<Vec<_>>()
#                 .try_into()
#                 .unwrap_or([zero; 9]);
# 
#             assert_unique_numbers(flattened_sq);
#         }
#     }
# 
#     // Proves that the solution matches up with the puzzle where applicable
#     for i in 0..9 {
#         for j in 0..9 {
#             let square = solution[i][j];
#             let constraint = board[i][j];
#             (constraint * (constraint - square)).constrain_eq(zero);
#         }
#     }
# }
# 
fn main() -> Result<(), Error> {
    let compiled_sudoku_proof = sudoku_proof.compile::<BulletproofsBackend>()?;
    let runtime = sudoku_proof.runtime::<BulletproofsBackend>()?;

    let ex_board = [
        [0, 7, 0, 0, 2, 0, 0, 4, 6],
        [0, 6, 0, 0, 0, 0, 8, 9, 0],
        [2, 0, 0, 8, 0, 0, 7, 1, 5],
        [0, 8, 4, 0, 9, 7, 0, 0, 0],
        [7, 1, 0, 0, 0, 0, 0, 5, 9],
        [0, 0, 0, 1, 3, 0, 4, 8, 0],
        [6, 9, 7, 0, 0, 2, 0, 0, 8],
        [0, 5, 8, 0, 0, 0, 0, 6, 0],
        [4, 3, 0, 0, 8, 0, 0, 7, 0],
    ];

    let ex_sol = [
        [8, 7, 5, 9, 2, 1, 3, 4, 6],
        [3, 6, 1, 7, 5, 4, 8, 9, 2],
        [2, 4, 9, 8, 6, 3, 7, 1, 5],
        [5, 8, 4, 6, 9, 7, 1, 2, 3],
        [7, 1, 3, 2, 4, 8, 6, 5, 9],
        [9, 2, 6, 1, 3, 5, 4, 8, 7],
        [6, 9, 7, 4, 1, 2, 5, 3, 8],
        [1, 5, 8, 3, 7, 9, 2, 6, 4],
        [4, 3, 2, 5, 8, 6, 9, 7, 1],
    ];

    let solution = ex_sol.map(|a| a.map(BulletproofsField::from)); // recall we need field elements here

    let board = ex_board.map(|a| a.map(BulletproofsField::from)); //  recall we need field elements here

    let proof = runtime.proof_builder(&compiled_sudoku_proof)
        .private_input(solution)
        .public_input(board)
        .prove()?;

    runtime.verification_builder(&compiled_sudoku_proof)
        .proof(&proof)
        .public_input(board)
        .verify()?;

    Ok(())
}
```
After specifying the backend proof system (`BulletproofsBackend`), we compile our `sudoku_proof` program and save the runnable program as `compiled_sudoku_proof`. We then construct a `runtime` so we can go on to proving and verifying things.

We define a starting Sudoku board as a public input (`ex_board`) and a valid solution (`ex_sol`) as a
private input. Since ZKP programs operate on field elements, we use `map` to get `board` and `solution` which are now in the correct format.

Once that's done, we're ready to create our proof! We call `runtime.proof_builder`, passing in our compiled ZKP program, our private inputs (just `solution`), any public inputs (just `board`) to create a proof (via `prove`). 

To verify the proof, we call `runtime.verification_builder`, passing in the compiled ZKP program, the proof received, and any public inputs (just the `board`) to verify if the proof is valid (via `verify`).

We see that verification was successful (as expected)! 
