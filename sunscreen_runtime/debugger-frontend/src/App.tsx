import React, { useCallback,  useEffect,  useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactSplit, { SplitDirection } from '@devbookhq/splitter'
import './App.css'

import { UberGraph } from './UberGraph';
import { SelectionT } from 'react-digraph';
import { render } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { open } from 'node:fs/promises';

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

type HiddenInputOp = {
  type: 'HiddenInput'
}

type PublicInputOp = {
  type: 'PublicInput'
}

type ConstantInputOp = {
  type: 'ConstantInput'
}

type ZkpConstantOp = {
  type: 'Constant'
  content: string
}

type InvokeGadgetOp = {
  type: 'InvokeGadget',
  content: string
}

type ConstraintOp = {
  type: 'Constraint',
  content: string
}

type MulOp = {
  type: 'Mul'
}

type FheProgramOperation = InputCiphertextOp | InputPlaintextOp | MultiplyOp | AddOp | SubOp | RelinearizeOp | OutputCiphertextOp

type ZkpProgramOperation = HiddenInputOp | PublicInputOp | ConstantInputOp | MultiplyOp | AddOp | SubOp | InvokeGadgetOp | ConstraintOp | ZkpConstantOp | MulOp

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

type ZkpProgram = {
  graph: { graph: {graph: ZkpProgramGraph}};
  data: any
}


type ZkpProgramGraph = {
  nodes: [{ operation: ZkpProgramOperation }],
  edges: FheProgramEdge
}

const dataToGraph = (data: FheProgramGraph | ZkpProgramGraph) => {
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
        nodes.push({id: i, title: "", type: 'relinearize'})
        break
      case 'Mul':
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
      case 'Constraint':
        nodes.push({id: i, title: "", type: 'constraint', constraint: op.content})
        break;
      case 'HiddenInput': 
      case 'PublicInput':
      case 'ConstantInput':
        
      default: 
        nodes.push({id: i, title: JSON.stringify(op), type: 'empty'})
        break;
    }
  }
  for (let i: number = 0; i < data.edges.length; ++i) {
    edges.push({source: data.edges[i][0], target: data.edges[i][1], type: data.edges[i][2]})
  }
  return {nodes: nodes, edges: edges}
}

async function isProblematic(node, session: string) {
  switch (node.type) {
    case 'add':
    case 'sub':
    case 'multiply':
      if (session.split('_')[0] === 'zkp') {
        return false
      } else {
        const info = await fetch(`sessions/${session}/${node.id}`).then(d => d.json())
        return info.Bfv.overflowed || info.Bfv.noise_budget <= 0
      }
      break;
    case 'constraint':
      const info = await fetch(`sessions/${session}/${node.id}`).then(d => d.json())
      return info.Zkp.value != 0
    default:
      return false;
  }
  return false;
}
async function updateProblematicNodes(graph, session) {
  const newGraph = JSON.parse(JSON.stringify(graph))
  const nodes = newGraph.nodes;
  for (const node of nodes) {
    if (await isProblematic(node, session)) {
      node.type = "prob" + node.type.charAt(0).toUpperCase() + node.type.slice(1)
    }
  }
  return newGraph
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
  const [session, setSession] = useState<string>("");
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
    }, [setLine, setGraph, session]
  )

  const updateSelection = useCallback(
    async (selection, e) => {
      select(selection); 
      const node = selection.nodes?.values().next().value;
      console.log(node)
      if (node != null) {
        // console.log(session)
        if (session.split('_')[0] == "fhe") {
          setInfo({
            ...selection.nodes?.values().next().value, 
            ...(await fetch(`sessions/${session}/${node.id}`).then(d => d.json())).Bfv,
            stacktrace: filterStackTrace(await fetch(`sessions/${session}/stacktrace/${node.id}`).then(d => d.json()))
          })
        } else {
          setInfo({
            ...selection.nodes?.values().next().value, 
            ...(await fetch(`sessions/${session}/${node.id}`).then(d => d.json())).Zkp,
            stacktrace: filterStackTrace(await fetch(`sessions/${session}/stacktrace/${node.id}`).then(d => d.json()))
          })
        }
        
      } else {
        setInfo({id: "no node selected"})
      }
    }, [select, session]
  )

  const updateSession = useCallback(
    (event) => {
      const newSession = event.target.value
      
      setSession(newSession)
    }, [setSession]
  )

  useEffect(() => {
    const update = async () => {
      console.log("New Session:" +  session)
      const graph = await updateProblematicNodes(dataToGraph(await fetch(`/sessions/${session}`).then(d => d.json())), session)
      setGraph(graph)
      setCode(await fetch(`/programs/${session}`).then(p => p.json()))
      
      // const delay = ms => new Promise(res => setTimeout(res, ms));
      // await delay(1000)
      // alert(session)
    }
    update()
  }, [session])

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
              <SessionPicker sessionList={sessionList} onUpdate={updateSession}/> 
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
    if (Object.keys(info).includes('stacktrace')) {
      return (<div style={{fontFamily: 'sans-serif'}}>
        {Object.keys(info).filter(k => k != "stacktrace").map((k) => (<p>{k}: {JSON.stringify(info[k])}</p>))}
        <p>stacktrace:</p>
        {info.stacktrace.map(c => (<p>{`${c.callee_name.split("::").at(-2)} @ ${c.callee_file}:${c.callee_lineno}`}</p>))}
      </div>)
    } else {
      return (<div>
        {Object.keys(info).filter(k => k != "stacktrace").map((k) => (<p>{k}: {JSON.stringify(info[k])}</p>))}
      </div>)
    }
    
  }
  return <p>{JSON.stringify(info)}</p>
}

function SessionPicker({sessionList, onUpdate}: {sessionList: string[], onUpdate: (string) => void}) {
  
  return (
    <select onChange={onUpdate} style={{backgroundColor: 'white', fontFamily: 'monospace'}}>
      <option value='none'>Select a session!</option>
      {sessionList.map(s => (<option value={s}>{s}</option>))}
    </select>
  )
}

window.addEventListener('load', () => {
  alert()
  const root = render(<App/>, document.getElementById('root'));
});

function filterStackTrace(st) {
  console.log(st)
  const re1 = RegExp("\S*/sunscreen_compiler_common/src/\S*")
  const re2 = RegExp("\S*/sunscreen/src/\S*")
  const re3 = RegExp("\S*/rustc/\S*")
  const re4 = RegExp("\S*/cargo/\*")
  const filtered = st.filter(c => !re1.test(c.callee_file))
    .filter(c => !re2.test(c.callee_file))
    .filter(c => !re3.test(c.callee_file))
    .filter(c => !re4.test(c.callee_file))
    .filter(c => c.callee_file !== 'No such file')
  return filtered;
}

const excludedKeys = ['x', 'y', 'title']

function infoToHtml(info: any) {
  
}

// async function getLine(filePath, lineNo) {
//   const file = await open(filePath)
//   let currLine = 0;
//   for await (const line of file.readLines()) {
//     currLine += 1;
//     if (currLine === lineNo) {
//       return line
//     }
//   }
// }
