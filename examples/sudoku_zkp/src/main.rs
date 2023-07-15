use sunscreen::{
    bulletproofs::BulletproofsBackend,
    types::zkp::{BulletproofsField, NativeField},
    zkp_program, zkp_var, BackendField, Compiler, Error, ZkpProgramFnExt, ZkpRuntime,
};

#[zkp_program]
fn sudoku_proof<F: BackendField>(
    #[public] board: [[NativeField<F>; 9]; 9],
    solution: [[NativeField<F>; 9]; 9],
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

    // Proves that the solution matches up with the puzzle where applicable
    for i in 0..9 {
        for j in 0..9 {
            let square = solution[i][j];
            let constraint = board[i][j];
            (constraint * (constraint - square)).constrain_eq(zero);
        }
    }
}

fn main() -> Result<(), Error> {
    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(sudoku_proof)
        .compile()?;

    let prog = app.get_zkp_program(sudoku_proof).unwrap();

    let runtime = ZkpRuntime::new(BulletproofsBackend::new())?;

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

    let solution = ex_sol.map(|a| a.map(BulletproofsField::from));

    let board = ex_board.map(|a| a.map(BulletproofsField::from));

    let proof = runtime.prove(prog, vec![], vec![board], vec![solution])?;

    runtime.verify(prog, &proof, vec![], vec![board])?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn valid_example() {
        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(sudoku_proof)
            .compile()
            .unwrap();

        let prog = app.get_zkp_program(sudoku_proof).unwrap();

        let runtime = ZkpRuntime::new(BulletproofsBackend::new()).unwrap();

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

        let solution = ex_sol.map(|a| a.map(BulletproofsField::from));
        let board = ex_board.map(|a| a.map(BulletproofsField::from));

        let proof = runtime
            .prove(prog, vec![], vec![board], vec![solution])
            .unwrap();

        let verify = runtime.verify(prog, &proof, vec![], vec![board]);

        assert!(verify.is_ok());
    }

    #[test]
    fn bad_solution() {
        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(sudoku_proof)
            .compile()
            .unwrap();

        let prog = app.get_zkp_program(sudoku_proof).unwrap();

        let runtime = ZkpRuntime::new(BulletproofsBackend::new()).unwrap();

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
            [1, 7, 5, 9, 2, 1, 3, 4, 6],
            [3, 6, 1, 7, 5, 4, 8, 9, 2],
            [2, 4, 9, 8, 6, 3, 7, 1, 5],
            [5, 8, 4, 6, 9, 7, 1, 2, 3],
            [7, 1, 3, 2, 4, 8, 6, 5, 9],
            [9, 2, 6, 1, 3, 5, 4, 8, 7],
            [6, 9, 7, 4, 1, 2, 5, 3, 8],
            [1, 5, 8, 3, 7, 9, 2, 6, 4],
            [4, 3, 2, 5, 8, 6, 9, 7, 1],
        ];

        let solution = ex_sol.map(|a| a.map(BulletproofsField::from));

        let board = ex_board.map(|a| a.map(BulletproofsField::from));

        let proof = runtime.prove(prog, vec![], vec![board], vec![solution]);

        assert!(proof.is_err());
    }

    #[test]
    fn out_of_bounds_input() {
        let app = Compiler::new()
            .zkp_backend::<BulletproofsBackend>()
            .zkp_program(sudoku_proof)
            .compile()
            .unwrap();

        let prog = app.get_zkp_program(sudoku_proof).unwrap();

        let runtime = ZkpRuntime::new(BulletproofsBackend::new()).unwrap();

        let ex_board = [[0; 9]; 9];

        let ex_sol = [
            [8, 7, 5, 9, 2, 1, 3, 4, 10],
            [3, 6, 1, 7, 5, 4, 8, 9, 2],
            [2, 4, 9, 8, 6, 3, 7, 1, 5],
            [5, 8, 4, 6, 9, 7, 1, 2, 3],
            [7, 1, 3, 2, 4, 8, 6, 5, 9],
            [9, 2, 6, 1, 3, 5, 4, 8, 7],
            [6, 9, 7, 4, 1, 2, 5, 3, 8],
            [1, 5, 8, 3, 7, 9, 2, 6, 4],
            [4, 3, 2, 5, 8, 6, 9, 7, 1],
        ];

        let solution = ex_sol.map(|a| a.map(BulletproofsField::from));

        let board = ex_board.map(|a| a.map(BulletproofsField::from));

        let proof = runtime.prove(prog, vec![], vec![board], vec![solution]);

        assert!(proof.is_err());
    }
}
