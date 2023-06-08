use sunscreen::{
    types::zkp::{ConstrainCmp, NativeField},
    zkp_program, BackendField, ZkpProgramInput, Compiler, Runtime,
};
use sunscreen_zkp_backend::{bulletproofs::BulletproofsBackend, ZkpBackend};

type BPField = NativeField<<BulletproofsBackend as ZkpBackend>::Field>;

fn main() {
    let app = Compiler::new()
        .zkp_backend::<BulletproofsBackend>()
        .zkp_program(sudoku_proof)
        .compile()
        .unwrap();

    let prog = app.get_zkp_program(sudoku_proof).unwrap();

    let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

    let ex_puzzle = [
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

    let board: Vec<ZkpProgramInput> = vec![ex_sol.map(|a| a.map(BPField::from)).into()];

    let cons: Vec<ZkpProgramInput> = vec![ex_puzzle.map(|a| a.map(BPField::from)).into()];

    let proof = runtime.prove(prog, cons.clone(), vec![], board).unwrap();

    let verify = runtime.verify(prog, &proof, cons.clone(), vec![]);

    assert!(verify.is_ok());
}

#[zkp_program(backend = "bulletproofs")]
fn sudoku_proof<F: BackendField>(
    #[constant] constraints: [[NativeField<F>; 9]; 9],
    board: [[NativeField<F>; 9]; 9],
) {
    fn contains_circuit<F: BackendField>(
        arr: [ProgramNode<NativeField<F>>; 9],
        i: NativeField<F>,
    ) -> ProgramNode<NativeField<F>> {
        let mut circuit = NativeField::<F>::from(1).into_program_node();
        for a in arr {
            circuit = circuit * (i.into_program_node() - a);
        }
        return circuit;
    }
    // Proves that the board is actually valid: All inputs are from 1 to 9
    let one = NativeField::<F>::from(1).into_program_node();
    let nine = NativeField::<F>::from(9).into_program_node();
    let zero = NativeField::<F>::from(0).into_program_node();

    for i in 0..9 {
        for j in 0..9 {
            let square = board[i][j].into_program_node();
            let constraint = constraints[i][j].into_program_node();
            square.constrain_ge_bounded(one, 8);
            square.constrain_le_bounded(nine, 8);
            (constraint * (constraint - square)).constrain_eq(zero);
        }
    }

    // Checks rows contain every number from 1 to 9
    for row in board {
        for i in 1..=9 {
            let circuit = contains_circuit(row, NativeField::<F>::from(i));
            circuit.constrain_eq(zero);
        }
    }

    // Checks columns contain each number from 1 to 9
    for col in 0..9 {
        for i in 1..=9 {
            let column = board.map(|r| r[col]);
            let circuit = contains_circuit(column, NativeField::<F>::from(i));
            circuit.constrain_eq(zero);
        }
    }

    // Checks squares contain each number from 1 to 9
    for i in 0..3 {
        for j in 0..3 {
            let rows = &board[(i * 3)..(i * 3 + 3)];

            let square = rows.iter().map(|s| &s[(j * 3)..(j * 3 + 3)]);

            let flattened_sq: [ProgramNode<NativeField<F>>; 9] = square
                .flatten()
                .copied()
                .collect::<Vec<_>>()
                .try_into()
                .unwrap_or([zero; 9]);

            for k in 1..=9 {
                let circuit = contains_circuit(flattened_sq, NativeField::<F>::from(k));
                circuit.constrain_eq(zero);
            }
        }
    }
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

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

        let ex_puzzle = [
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

        let board: Vec<ZkpProgramInput> = vec![ex_sol.map(|a| a.map(BPField::from)).into()];

        let cons: Vec<ZkpProgramInput> = vec![ex_puzzle.map(|a| a.map(BPField::from)).into()];

        let proof = runtime.prove(prog, cons.clone(), vec![], board).unwrap();

        let verify = runtime.verify(prog, &proof, cons.clone(), vec![]);

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

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

        let ex_puzzle = [
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

        let board: Vec<ZkpProgramInput> = vec![ex_sol.map(|a| a.map(BPField::from)).into()];

        let cons: Vec<ZkpProgramInput> = vec![ex_puzzle.map(|a| a.map(BPField::from)).into()];

        let proof = runtime.prove(prog, cons.clone(), vec![], board);

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

        let runtime = Runtime::new_zkp(&BulletproofsBackend::new()).unwrap();

        let ex_puzzle = [[0; 9]; 9];

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

        let board: Vec<ZkpProgramInput> = vec![ex_sol.map(|a| a.map(BPField::from)).into()];

        let cons: Vec<ZkpProgramInput> = vec![ex_puzzle.map(|a| a.map(BPField::from)).into()];

        let proof = runtime.prove(prog, cons.clone(), vec![], board);

        assert!(proof.is_err());
    }
}
