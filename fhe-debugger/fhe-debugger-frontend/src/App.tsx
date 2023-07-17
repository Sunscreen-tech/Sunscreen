import React, { useCallback,  useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactSplit, { SplitDirection } from '@devbookhq/splitter'
import './App.css'

import { UberGraph } from './UberGraph';
import { SelectionT } from 'react-digraph';

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

const exampleUberGraph = {
  nodes: [
      { id: 1, title: '2', type: 'empty' },
      { id: 2, title: '3', type: 'empty'  },
      { id: 3, title: '+', type: 'empty'  },
      { id: 4, title: 'square', type: 'empty', test: 27183912  },
  ],
  edges: [
    { source: 1, target: 3, directed: true, arrowhead: 'normal' },
    { source: 2, target: 3, directed: true, arrowhead: 'normal' },
    { source: 3, target: 4, directed: true, arrowhead: 'normal' },
  ]
}

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

const dataToGraph = (data: { graph: { graph: any; }; nodes: string | any[]; edges: string | any[]; }, incRelin: boolean) => {
  
  data = data.graph.graph
  var nodes: any[] = [];
  var edges: any[] = [];
  if (incRelin) {
    for (let i: number = 0; i < data.nodes.length; ++i) {
      if (data.nodes[i].operation.constructor == Object && data.nodes[i].operation.hasOwnProperty('InputCiphertext')) {
        nodes.push({id: i, title: JSON.stringify(data.nodes[i].operation.InputCiphertext), type: 'input'})
      } else {
        nodes.push({id: i, title: JSON.stringify(data.nodes[i].operation), type: 'empty'})
      }
    }
    for (let i: number = 0; i < data.edges.length; ++i) {
      edges.push({source: data.edges[i][0], target: data.edges[i][1], type: data.edges[i][2]})
    }
  } else {
    for (let i: number = 0; i < data.nodes.length; ++i) {
      if (data.nodes[i].operation.constructor == Object && data.nodes[i].operation.hasOwnProperty('InputCiphertext')) {
        nodes.push({id: i, title: JSON.stringify(data.nodes[i].operation.InputCiphertext), type: 'input'})
      } else if (data.nodes[i].operation == "Relinearize") {

      } else {
        nodes.push({id: i, title: JSON.stringify(data.nodes[i].operation), type: 'empty'})
      }
    }
    var relinSources = Array<number>(5)

    for (let i: number = 0; i < data.edges.length; ++i) {
      if (data.nodes[data.edges[i][1]].operation == "Relinearize") {
        relinSources[data.edges[i][1]] = data.edges[i][0];
      } else if (data.nodes[data.edges[i][0]].operation != "Relinearize") {
        edges.push({source: data.edges[i][0], target: data.edges[i][1], type: data.edges[i][2]})
      } 
    }
    for (let i: number = 0; i < data.edges.length; ++i) {
      if (data.nodes[data.edges[i][0]].operation == "Relinearize") {
        edges.push({source: relinSources[data.edges[i][0]], target: data.edges[i][1], type: data.edges[i][2]})
      } 
    }
  }
  return {nodes: nodes, edges: edges}
}


const App = () => {
  
  const sampleData = JSON.parse(`{"graph":{"graph":{"nodes":[{"operation":{"InputCiphertext":0}},{"operation":{"InputCiphertext":1}},{"operation":{"InputCiphertext":2}},{"operation":{"InputCiphertext":3}},{"operation":"Multiply"},{"operation":"Multiply"},{"operation":"Multiply"},{"operation":"Add"},{"operation":"OutputCiphertext"},{"operation":"OutputCiphertext"},{"operation":"Relinearize"},{"operation":"Relinearize"},{"operation":"Relinearize"}],"node_holes":[],"edge_property":"directed","edges":[[0,4,"Left"],[3,4,"Right"],[1,5,"Left"],[2,5,"Right"],[1,6,"Left"],[3,6,"Right"],[12,7,"Left"],[10,7,"Right"],[7,8,"Unary"],[11,9,"Unary"],[5,10,"Unary"],[6,11,"Unary"],[4,12,"Unary"]]}},"data":"Bfv"}`)
  const exGraph = dataToGraph(sampleData, true);
  const [selectedLine, setLine] = useState<number>(0);
  const [vertSize, setVertSize] = useState<any[]>();
  const [horSize, setHorSize] = useState<any[]>();
  const [currGraph, setGraph] = useState(exGraph);
  const [selected, select] = useState<SelectionT | null>(null);

  const updateLine = useCallback(
    (lineNumber: number) => {
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
      setGraph(lineNumber !== 1 ? graph : exGraph)
    }, [setLine, setGraph]
  )

  const updateSelection = useCallback(
    (selection, e) => {select(selection); console.log(selection.nodes?.values().next().value)}, [select]
  )

  return (
    <div className='splits'>
      <ReactSplit direction={SplitDirection.Horizontal} onResizeFinished={(p, n) => setHorSize(n)} initialSizes={horSize}>
        <div className="pane">
          <ReactSplit direction={SplitDirection.Vertical} onResizeFinished={(p, n) => setVertSize(n)} initialSizes={vertSize}>
            <div className='pane'><CodeBlock 
            code={exampleCode} 
            onClickHandler={updateLine}
            selectedLine={selectedLine}
            ></CodeBlock></div>
            <div className='pane'><NodeInfo info={selected?.nodes?.values().next().value}/></div>
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


export default App;