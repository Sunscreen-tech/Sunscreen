import React, { useCallback,  useEffect,  useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactSplit, { SplitDirection } from '@devbookhq/splitter'
import './App.css'

import { UberGraph } from './UberGraph';
import { SelectionT } from 'react-digraph';
import ReactDOM from 'react-dom';
import { render } from 'react-dom';

interface CodeBlockProps {
  code: string;
  onClickHandler: (number: number) => void;
  selectedLine: number;
}

function CodeBlock({ code, onClickHandler, selectedLine }: CodeBlockProps) {
  const onSelectLine = useCallback(
    (lineNumber: number) => onClickHandler(lineNumber),
    [onClickHandler]
  )

  const lineProps = useCallback((lineNumber: number) => {
    return lineNumber !== selectedLine ?
      {
        onClick: () => onSelectLine(lineNumber),
      } :
      {
        onClick: () => onSelectLine(lineNumber),
        style: {backgroundColor: "saddlebrown"}
      }
  }, [onSelectLine, selectedLine]);

  return (
    <SyntaxHighlighter
      language="rust"
      style={atomDark}
      showLineNumbers={true}
      wrapLines={true}
      useInlineStyles={true}
      lineProps={lineProps}
      lineNumberStyle={{minWidth: 10}}
    >
      {code}
    </SyntaxHighlighter>
  );
};

const exampleCode: string = `fn sudoku_proof<F: BackendField>(
  #[constant] constraints: [[NativeField<F>; 9]; 9],
  board: [[NativeField<F>; 9]; 9],
) {
  fn assert_unique_numbers<F: BackendField>(arr: [ProgramNode<NativeField<F>>; 9]) {
      for i in 1..=9 {
          let mut circuit = NativeField::<F>::from(1).into_program_node();
          for a in arr {
              circuit = circuit * (NativeField::<F>::from(i).into_program_node() - a);
          }
          circuit.constrain_eq(NativeField::<F>::from(0));
      }
  }
  // Proves that the board matches up with the puzzle where applicable
  let zero = NativeField::<F>::from(0).into_program_node();

  for i in 0..9 {
      for j in 0..9 {
          let square = board[i][j].into_program_node();
          let constraint = constraints[i][j].into_program_node();
          (constraint * (constraint - square)).constrain_eq(zero);
      }
  }

  // Checks rows contain every number from 1 to 9
  for row in board {
      assert_unique_numbers(row);
  }

  // Checks columns contain each number from 1 to 9
  for col in 0..9 {
      let column = board.map(|r| r[col]);
      assert_unique_numbers(column);
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

          assert_unique_numbers(flattened_sq);
      }
  }
}`

type InputCiphertextOp = {
  kind: 'InputCiphertext';
  id: number
};

type MultiplyOp = {
  kind: 'Multiply'
};

type AddOp = {
  kind: 'Add'
};

type RelinearizeOp = {
  kind: 'Relinearize'
};

type OutputCiphertextOp = {
  kind: 'OutputCiphertext'
};

type FheProgramOperation = InputCiphertextOp | MultiplyOp | AddOp | RelinearizeOp | OutputCiphertextOp

type FheProgramNode = {
  operation: FheProgramOperation
}

type EdgeType = 'Left' | 'Right' | 'Unary'
type FheProgramEdge = [number, number, EdgeType]

type FheProgramGraph = {
  nodes: FheProgramNode[];
  edges: FheProgramEdge[]
}

type FheProgram = {
  graph: { graph: { graph: FheProgramGraph }};
  data: 'Bfv'
}

const dataToGraph = (data: FheProgramGraph) => {
  const nodes: any[] = [];
  const edges: any[] = [];

  for (let i: number = 0; i < data.nodes  .length; ++i) {
    const op = data.nodes[i].operation
    switch (op.kind) {
      case 'InputCiphertext':
        nodes.push({id: op.id, title: "", type: 'input'})
        break
      case 'Multiply':
      case 'Add':
      case 'Relinearize':
      case 'OutputCiphertext':
      default: 
        nodes.push({id: i, title: JSON.stringify(data.nodes[i].operation), type: 'empty'})
    }
  }
  for (let i: number = 0; i < data.edges.length; ++i) {
    edges.push({source: data.edges[i][0], target: data.edges[i][1], type: data.edges[i][2]})
  }
  return {nodes: nodes, edges: edges}
}


const App = () => {

  // const exGraph = dataToGraph({}, true);
  const [selectedLine, setLine] = useState<number>(0);
  const [vertSize, setVertSize] = useState<any[]>();
  const [horSize, setHorSize] = useState<any[]>();
  const [currCode, setCode] = useState<string>("select a session");
  const [currGraph, setGraph] = useState({nodes: [], edges: []});
  const [selected, select] = useState<SelectionT | null>(null);
  const [sessionList, setSessionList] = useState<string[]>([]);
  const [session, setSession]  = useState<string>('mad_0');

  useEffect(
    () => {fetch("/sessions").then(j => j.json()).then(l => setSessionList(l))}, []
  )

  

  const updateLine = useCallback(
    async (lineNumber: number) => {
      setLine(lineNumber)
      const graph = {
        nodes: [
          {
            id: 1, 
            title: `line ${lineNumber}`, 
            type: 'empty', 
            x: -10, 
            y: 0
          },
          {
            id: 2, 
            title: `test_func`, 
            type: 'problematic', 
            x: 0, 
            y: 0
          }
        ], 
        edges: [
          { source: 1, target: 2, directed: true, arrowhead: 'normal' }
        ]
      }
      setGraph(lineNumber !== 1 ? graph : dataToGraph(await fetch(`/sessions/${session}`).then(d => d.json())))
    }, [setLine, setGraph]
  )

  const updateSelection = useCallback(
    (selection, e) => {select(selection); console.log(selection.nodes?.values().next().value)}, [select]
  )

  const updateSession = useCallback(
    async (event) => {
      const newSession = event.target.value
      setSession(newSession)
      console.log(newSession);
      setGraph(dataToGraph(await fetch(`/sessions/${newSession}`).then(d => d.json())))
      setCode(await fetch(`/programs/${newSession}`).then(p => p.text()))
      console.log(session)
    }, [setSession, setGraph]
  )

  return (
    
    <div className='splits'>
      <ReactSplit direction={SplitDirection.Horizontal} onResizeFinished={(p, n) => setHorSize(n)} initialSizes={horSize}>
        <div className="pane">
          <ReactSplit direction={SplitDirection.Vertical} onResizeFinished={(p, n) => setVertSize(n)} initialSizes={vertSize}>
            <div className='pane'><CodeBlock 
            code={currCode} 
            onClickHandler={updateLine}
            selectedLine={selectedLine}
            ></CodeBlock></div>
            <div className='pane'>
              <SessionPicker sessionList={sessionList} setSession={updateSession}/> 
              <NodeInfo info={selected?.nodes?.values().next().value}/>
            </div>
          </ReactSplit>
        </div>
        <div className='pane'><UberGraph
          graph={currGraph} onSelect={updateSelection} selected={selected} /></div>
      </ReactSplit>
    </div>
  );
}

function NodeInfo({info}) {
  if (info !== null) {
    return <p>{JSON.stringify(info)}</p>
  }
  return <p>{JSON.stringify(info)}</p>
}

function SessionPicker({sessionList, setSession}: {sessionList: string[], setSession: (string) => void}) {
  
  return (
    <select onChange={setSession} style={{backgroundColor: 'white'}}>
      {sessionList.map(s => (<option value={s}>{s}</option>))}
    </select>
  )
}

window.addEventListener('load', () => {
  alert()
  const root = render(<App/>, document.getElementById('root'));
});


