import React, { useCallback, useEffect, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactSplit, { SplitDirection } from '@devbookhq/splitter'
import './App.css'

import { UberGraph } from './UberGraph';
import { SelectionT } from 'react-digraph';
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
        style: { backgroundColor: "saddlebrown" }
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
      lineNumberStyle={{ minWidth: 10 }}
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

type PrivateInputOp = {
  type: 'PrivateInput'
}

type FheProgramOperation = InputCiphertextOp | InputPlaintextOp | MultiplyOp | AddOp | SubOp | RelinearizeOp | OutputCiphertextOp

type ZkpProgramOperation = HiddenInputOp | PublicInputOp | ConstantInputOp | MultiplyOp | AddOp | SubOp | InvokeGadgetOp | ConstraintOp | ZkpConstantOp | MulOp | PrivateInputOp

type FheProgramNode = {
  operation: FheProgramOperation
}

type GraphEdge = [number, number, any]


type FheProgram = {
  graph: { graph: { graph: FheProgramGraph } };
  data: 'Bfv'
}

type ZkpProgram = {
  graph: { graph: { graph: ZkpProgramGraph } };
  data: any
}

type FheProgramGraph = {
  nodes: [{ operation: FheProgramOperation }],
  edges: GraphEdge
}

type ZkpProgramGraph = {
  nodes: [{ operation: ZkpProgramOperation }],
  edges: GraphEdge
}

type DisplayGraph = {
  nodes: [DisplayNode],
  edges: null | GraphEdge,
  node_holes: number[],
}

type FheOperationNode = { type: "FheOperation", id: number, op: FheProgramOperation, problematic: boolean }
type GraphNode = { type: "Group", id: number, problematic: boolean, title: string }
type ZkpOperationNode = { type: "Zkpoperation", id: number, op: ZkpProgramOperation, problematic: boolean }

type DisplayNode = GraphNode | FheOperationNode | ZkpOperationNode

function groupToGraph(groupData: DisplayGraph) {
  const nodes: any[] = [];
  const edges: any[] = [];

  for (let i = 0; i < groupData.nodes.length; ++i) {
    const node = groupData.nodes[i];
    switch (node.type) {
      case "Group":
        if (node.problematic) {
          nodes.push({ id: i + groupData.node_holes.length, title: node.title, type: 'probGroup', groupId: node.id })
        } else {
          nodes.push({ id: i + groupData.node_holes.length, title: node.title, type: 'group', groupId: node.id })
        }
        break;
      default:
        const op = node.op
        switch (op.type) {
          case 'InputCiphertext':
            console.log('test')
            nodes.push({ id: node.id, title: "", type: 'inputCiphertext' })
            break
          case 'Relinearize':
            nodes.push({ id: node.id, title: "", type: 'relinearize' })
            break
          case 'Mul':
          case 'Multiply':
            if (node.problematic) {
              nodes.push({ id: node.id, title: "", type: 'probMultiply' })
            } else {
              nodes.push({ id: node.id, title: "", type: 'multiply' })
            }
            
            break
          case 'Add':
            if (node.problematic) {
              nodes.push({ id: node.id, title: "", type: 'probAdd' })
            } else {
              nodes.push({ id: node.id, title: "", type: 'add' })
            }            
            break
          case 'Sub':
            if (node.problematic) {
              nodes.push({ id: node.id, title: "", type: 'probSub' })
            } else {
              nodes.push({ id: node.id, title: "", type: 'sub' })
            }            
            break
          case 'OutputCiphertext':
            nodes.push({ id: node.id, title: "", type: 'outputCiphertext' })
            break;
          case 'Constraint':
            if (node.problematic) {
              nodes.push({ id: node.id, title: "", type: 'probConstraint', constraint: op.content })            
            } else {
              nodes.push({ id: node.id, title: "", type: 'constraint', constraint: op.content })
            }
            break;
          case 'HiddenInput':
            nodes.push({ id: node.id, title: "", type: 'hidInput' })
            break;
          case 'PublicInput':
            nodes.push({ id: node.id, title: "", type: 'pubInput' })
            break;
          case 'PrivateInput':
            nodes.push({ id: node.id, title: "", type: 'privInput' })
            break;
          case 'Constant':
          case 'ConstantInput':
            nodes.push({ id: node.id, title: "", type: 'constantInput' })
            break;
          default:
            nodes.push({ id: node.id, title: JSON.stringify(op), type: 'empty' })
            break;
        }
    }
    for (let i = 0; i < groupData.edges.length; i++) {
      const edge = groupData.edges[i];
      // console.log(edge);
      if (edge !== null) {
        edges.push({ source: edge[0], target: edge[1], type: edge[2] });
      }
    }
  }
  return { nodes: nodes, edges: edges }
}


const dataToGraph = (data: FheProgramGraph | ZkpProgramGraph) => {
  const nodes: any[] = [];
  const edges: any[] = [];

  for (let i: number = 0; i < data.nodes.length; ++i) {
    const op = data.nodes[i].operation
    switch (op.type) {
      case 'InputCiphertext':
        console.log('test')
        nodes.push({ id: i, title: "", type: 'inputCiphertext' })
        break
      case 'Relinearize':
        nodes.push({ id: i, title: "", type: 'relinearize' })
        break
      case 'Mul':
      case 'Multiply':
        nodes.push({ id: i, title: "", type: 'multiply' })
        break
      case 'Add':
        nodes.push({ id: i, title: "", type: 'add' })
        break
      case 'Sub':
        nodes.push({ id: i, title: "", type: 'sub' })
        break
      case 'OutputCiphertext':
        nodes.push({ id: i, title: "", type: 'outputCiphertext' })
        break;
      case 'Constraint':
        nodes.push({ id: i, title: "", type: 'constraint', constraint: op.content })
        break;
      case 'HiddenInput':
        nodes.push({ id: i, title: "", type: 'hidInput' })
        break;
      case 'PublicInput':
        nodes.push({ id: i, title: "", type: 'pubInput' })
        break;
      case 'PrivateInput':
        nodes.push({ id: i, title: "", type: 'privInput' })
        break;
      case 'Constant':
      case 'ConstantInput':
        nodes.push({ id: i, title: "", type: 'constantInput' })
        break;
      default:
        nodes.push({ id: i, title: JSON.stringify(op), type: 'empty' })
        break;
    }
  }
  for (let i: number = 0; i < data.edges.length; ++i) {
    edges.push({ source: data.edges[i][0], target: data.edges[i][1], type: data.edges[i][2] })
  }
  return { nodes: nodes, edges: edges }
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
    case 'constraint':
      const info = await fetch(`sessions/${session}/${node.id}`).then(d => d.json())
      return info.Zkp != 0
    default:
      return false;
  }
}


const App = () => {

  const [selectedLine, setLine] = useState<number>(0);
  const [vertSize, setVertSize] = useState<any[]>();
  const [horSize, setHorSize] = useState<any[]>();
  const [currCode, setCode] = useState<string>("select a session");
  const [currGraph, setGraph] = useState({ nodes: [], edges: [] });
  const [selected, select] = useState<SelectionT | null>(null);
  const [sessionList, setSessionList] = useState<string[]>([]);
  const [session, setSession] = useState<string>("");
  const [info, setInfo] = useState<any>({ id: "no node selected" });
  const [problemNodes, setProblemNodes] = useState<number[]>([]);
  const [groupStack, setGroupStack] = useState<number[]>([]);

  useEffect(
    () => { fetch("/sessions").then(j => j.json()).then(l => setSessionList(l)) }, []
  )

  const pushGroup = (id: number) => {
    setGroupStack(groupStack.concat([id]));
  }

  const popGroup = () => {
    if (groupStack.length != 1) {
      setGroupStack(groupStack.slice(0, -1));
    }
  }

  const updateLine = useCallback(
    async (lineNumber: number) => {
    }, [setLine, setGraph, session]
  )

  const updateSelection = useCallback(
    async (selection, e) => {
      select(selection);
      const node = selection.nodes?.values().next().value;
      console.log(node)

      if (node != null) {
        if (node.type == 'group' || node.type == 'probGroup') {
          setInfo({type: 'group', groupId: node.groupId})
        } else {
          if (session.split('_')[0] == "fhe") {
            setInfo({
              ...selection.nodes?.values().next().value,
              ...(await fetch(`sessions/${session}/${node.id}`).then(d => d.json())).Bfv,
              stacktrace: filterStackTrace(await fetch(`sessions/${session}/stacktrace/${node.id}`).then(d => d.json()))
            })
          } else {
            setInfo({
              ...selection.nodes?.values().next().value,
              value: (await fetch(`sessions/${session}/${node.id}`).then(d => d.json())).Zkp,
              stacktrace: filterStackTrace(await fetch(`sessions/${session}/stacktrace/${node.id}`).then(d => d.json()))
            })
          }
        }

      } else {
        setInfo({ id: "no node selected" })
      }
    }, [session]
  )

  const updateSession = useCallback(
    (event) => {
      const newSession = event.target.value

      setSession(newSession)
    }, [setSession]
  )

  useEffect(() => {
    setGroupStack([0]);
  }, [session])

  useEffect(() => {
      async function update() {
        const newGraph = groupToGraph(await fetch(`/sessions/${session}/groups/${groupStack.at(-1)}`).then(j => j.json()))
        console.log(newGraph);
        setGraph(newGraph)
        setCode(await fetch(`/programs/${session}/${groupStack.at(-1)}`).then(j => j.json()))
      }
      update()
    }, [groupStack]
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
              <SessionPicker sessionList={sessionList} onUpdate={updateSession} />
              <div>Problem Nodes: {JSON.stringify(problemNodes)}</div>
              <NodeInfo info={info} pushGroup={pushGroup} popGroup={popGroup} />
            </div>
          </ReactSplit>
        </div>
        <div className='pane'><UberGraph
          graph={currGraph} onSelect={updateSelection} selected={selected} /></div>
      </ReactSplit>
    </div>
  );
}

function NodeInfo({ info, pushGroup, popGroup }) {
  if (info != null) {
    if (Object.keys(info).includes('groupId')) {
      return (
        <div>
          <p>{`Group: ${info.groupId}`}</p>
          <button style={{backgroundColor: 'white'}} onClick={() => pushGroup(info.groupId)}>Step Into Group</button>
        </div>
      )
    } else if (Object.keys(info).includes('stacktrace')) {
      return infoToHtml(info);
    } else {
      if (Object.keys(info).includes('id') && info.id == "no node selected") {
        return <div>
          <p>No node selected</p>
          <button style={{backgroundColor: 'white'}} onClick={() => popGroup()}>Step Out of Group</button>
        </div>
      }
      return (<div>
        {Object.keys(info).filter(k => k != "stacktrace").map((k) => (<p>{k}: {JSON.stringify(info[k])}</p>))}
      </div>)
    }
  }
  return <p>{JSON.stringify(info)}</p>
}

function SessionPicker({ sessionList, onUpdate }: { sessionList: string[], onUpdate: (string) => void }) {

  return (
    <select onChange={onUpdate} style={{ backgroundColor: 'white', fontFamily: 'monospace' }}>
      <option value='none'>Select a session!</option>
      {sessionList.map(s => (<option value={s}>{s}</option>))}
    </select>
  )
}

window.addEventListener('load', () => {
  alert()
  const root = render(<App />, document.getElementById('root'));
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

const excludedKeys = ['x', 'y', 'title', 'stacktrace']

function infoToHtml(info: any) {
  const filteredKeys = Object.keys(info).filter(k => !excludedKeys.includes(k));
  if (info.type == 'probConstraint' || info.type == 'constraint') {
    info.value = info.value != "1"
  }
  return (<div style={{ fontFamily: 'sans-serif' }}>
    {filteredKeys.map((k) => (<p>{k}: {JSON.stringify(info[k])}</p>))}
    <p>stacktrace:</p>
    {info.stacktrace.map(c => (<p>{`${c.callee_name.split("::").at(-2)} @ ${c.callee_file}:${c.callee_lineno}`}</p>))}
  </div>)
}