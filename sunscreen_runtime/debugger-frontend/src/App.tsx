import React, { useCallback,  useEffect,  useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactSplit, { SplitDirection } from '@devbookhq/splitter'
import './App.css'

import { UberGraph } from './UberGraph';
import { SelectionT } from 'react-digraph';
import { render } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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
  type: 'InputCiphertext';
  id: number
};

type InputPlaintextOp = {
  type: 'InputCiphertext';
  id: number
};

type MultiplyOp = {
  type: 'Multiply'
  id: number
};

type AddOp = {
  type: 'Add'
  id: number
};

type SubOp = {
  type: 'Sub'
  id: number
};

type RelinearizeOp = {
  type: 'Relinearize'
  id: number
};

type OutputCiphertextOp = {
  type: 'OutputCiphertext'
  id: number
};

type FheProgramOperation = InputCiphertextOp | InputPlaintextOp | MultiplyOp | AddOp | SubOp | RelinearizeOp | OutputCiphertextOp

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

  for (let i: number = 0; i < data.nodes.length; ++i) {
    const op = data.nodes[i].operation
    switch (op.type) {
      case 'InputCiphertext':
        console.log('test')
        nodes.push({id: i, title: "", type: 'inputCiphertext'})
        break
      case 'Relinearize':
        nodes.push({id: i, title: <FontAwesomeIcon icon="down-left-and-up-right-to-center"></FontAwesomeIcon>, type: 'relinearize'})
        break
      case 'Multiply':
        nodes.push({id: i, title: "", type: 'multiply'})
        break
      case 'Add':
        nodes.push({id: i, title: "", type: 'add'})
        break
      case 'Sub':
        nodes.push({id: i, title: "", type: 'sub'})
        break
      case 'OutputCiphertext':
        nodes.push({id: i, title: "", type: 'outputCiphertext'})
        break;
      default: 
        nodes.push({id: i, title: JSON.stringify(data.nodes[i].operation), type: 'empty'})
        break;
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
  const [session, setSession] = useState<string>('chi_sq_optimized_fhe_program_0');
  const [info, setInfo] = useState<any>({id: "no node selected"});

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
    async (selection, e) => {
      select(selection); 
      const node = selection.nodes?.values().next().value;
      console.log(node)
      if (node != null) {
        console.log(session)
        setInfo({
          ...selection.nodes?.values().next().value, 
          ...(await fetch(`sessions/${session}/${node.id}`).then(d => d.json()))
        })
      } else {
        setInfo({id: "no node selected"})
      }
    }, [select]
  )

  const updateSession = useCallback(
    (event) => {
      const newSession = event.target.value
      
      setSession(newSession)
    }, [setSession]
  )

  useEffect(() => {
    const update = async () => {
      setGraph(dataToGraph(await fetch(`/sessions/${session}`).then(d => d.json())))
      setCode(await fetch(`/programs/${session}`).then(p => p.text()))
      alert(session)
      const delay = ms => new Promise(res => setTimeout(res, ms));
      await delay(1000)
      alert(session)
    }
    update()
  }, [session, setSession])

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
              <NodeInfo info={info}/>
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
  if (info != null) {
    for (let field in info) {
      
    }
    return (<div>
      {Object.keys(info).map((k) => (<p>{k}: {info[k]}</p>))}
    </div>)
  }
  return <p>{JSON.stringify(info)}</p>
}

function SessionPicker({sessionList, setSession}: {sessionList: string[], setSession: (string) => void}) {
  
  return (
    <select onChange={setSession} style={{backgroundColor: 'white'}}>
      <option value='none'>Select a session!</option>
      {sessionList.map(s => (<option value={s}>{s}</option>))}
    </select>
  )
}

window.addEventListener('load', () => {
  alert()
  const root = render(<App/>, document.getElementById('root'));
});


