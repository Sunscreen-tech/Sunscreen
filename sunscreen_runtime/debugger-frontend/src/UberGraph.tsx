import { GraphView } from "react-digraph";
import React from "react";

const GraphConfig =  {
  NodeTypes: {
    empty: { // required to show empty nodes
      typeText: "None",
      shapeId: "#empty", // relates to the type property of a node
      shape: (
        <symbol viewBox="0 0 100 100" id="empty" key="0">
          <circle cx="50" cy="50" r="45"></circle>
        </symbol>
      )
    },
    inputCiphertext: { // required to show empty nodes
      typeText: "Ciphertext Input",
      shapeId: "#inputCiphertext", // relates to the type property of a node
      shape: (
        <symbol viewBox="0 0 90 50" id="inputCiphertext" key="0">
          <rect cx='50' cy='50' width='90' height='50'/>
        </symbol>
      )
    },
    inputPlaintext: {
      typeText: "Plain Input",
      shapeId: '#inputPlaintext',
      shape: (
        <symbol viewBox="0 0 100 100" id="inputCiphertext" key="0">
          <ellipse cx='50' cy='50' width='90' height='50'/>
        </symbol>
      )
    },
    privInput: { // required to show empty nodes
      typeText: "Private Input",
      shapeId: "#privInput", // relates to the type property of a node
      shape: (
        <symbol viewBox="0 0 90 50" id="privInput" key="0">
          <rect cx='50' cy='50' width='90' height='50'/>
        </symbol>
      )
    },
    pubInput: {
      typeText: "Public Input",
      shapeId: '#pubInput',
      shape: (
        <symbol viewBox="0 0 100 100" id="pubInput" key="0">
          <ellipse cx='50' cy='50' width='90' height='50'/>
        </symbol>
      )
    },
    hidInput: {
      typeText: "Hidden Input",
      shapeId: '#hidInput',
      shape: (
        <symbol viewBox="0 0 100 100" id="hidInput" key="0">
          <ellipse cx='50' cy='50' width='90' height='50'/>
        </symbol>
      )
    },
    constantInput: {
      typeText: "Constant Input",
      shapeId: '#constantInput',
      shape: (
        <symbol viewBox="0 0 90 50" id="constantInput" key="0">
          <rect cx='50' cy='50' width='90' height='50'/>
        </symbol>
      )
    },
    outputCiphertext: { // required to show empty nodes
      typeText: "Output",
      shapeId: "#outputCiphertext", // relates to the type property of a node
      shape: (
        <symbol viewBox="0 0 100 100" id="outputCiphertext" key="0">
          <circle cx="50" cy="50" r="45"></circle>
        </symbol>
      )
    },
    add: {
      typeText: "+",
      shapeId: "#add",
      shape: (
        <symbol viewBox="0 0 50 50" id="add" key="0" fontSize="18pt" fill='aquamarine'>
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="12" fill="aquamarine" strokeWidth="1.5"></circle>
            <line x1="17.5" y1="25" x2="32.5" y2="25" strokeWidth="3.5"></line>
            <line x1="25" y1="17.5" x2="25" y2="32.5" strokeWidth="3.5"></line>
          </svg>

        </symbol>
      )
    },
    probAdd: {
      typeText: "",
      shapeId: "#probAdd",
      shape: (
        <symbol viewBox="0 0 50 50" id="probAdd" key="0" fontSize="18pt" fill='pink'>
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="12" fill="red" strokeWidth="1.5"></circle>
            <line x1="17.5" y1="25" x2="32.5" y2="25" strokeWidth="3.5"></line>
            <line x1="25" y1="17.5" x2="25" y2="32.5" strokeWidth="3.5"></line>
          </svg>

        </symbol>
      )
    },
    multiply: {
      typeText: "",
      shapeId: "#multiply",
      shape: (<symbol viewBox="0 0 50 50" id="multiply" key="0" fontSize="18pt">
        <svg viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="12" fill="khaki" strokeWidth="1.5"></circle>
          <line x1="20" y1="20" x2="30" y2="30" strokeWidth="3.5"></line>
          <line x1="30" y1="20" x2="20" y2="30" strokeWidth="3.5"></line>
        </svg>

      </symbol>)
    },
    probMultiply: {
      typeText: "",
      shapeId: "#probMultiply",
      shape: (<symbol viewBox="0 0 50 50" id="probMultiply" key="0" fontSize="18pt">
        <svg viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="12" fill="red" strokeWidth="1.5"></circle>
          <line x1="20" y1="20" x2="30" y2="30" strokeWidth="3.5"></line>
          <line x1="30" y1="20" x2="20" y2="30" strokeWidth="3.5"></line>
        </svg>

      </symbol>)
    },
    
    sub: {
      typeText: "",
      shapeId: "#sub",
      shape: (
        <symbol viewBox="0 0 50 50" id="sub" key="0" fontSize="18pt" fill='plum'>
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="12" fill="plum" strokeWidth="1.5"></circle>
            <line x1="17.5" y1="25" x2="32.5" y2="25" strokeWidth="3.5"></line>
          </svg>

        </symbol>
      )
    },
    probSub: {
      typeText: "",
      shapeId: "#probSub",
      shape: (
        <symbol viewBox="0 0 50 50" id="probSub" key="0" fontSize="18pt" fill='red'>
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="12" fill="pink" strokeWidth="1.5"></circle>
            <line x1="17.5" y1="25" x2="32.5" y2="25" strokeWidth="3.5"></line>
          </svg>

        </symbol>
      )
    },
    constraint: {
      typeText: "",
      shapeId: "#constraint",
      shape: (
        <symbol viewBox="0 0 50 50" id="constraint" key="0" fontSize="18pt" fill='plum'>
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="12" fill="lime" strokeWidth="1.5"></circle>
            <line x1="17.5" y1="28" x2="32.5" y2="28" strokeWidth="3.5"></line>
            <line x1="17.5" y1="22" x2="32.5" y2="22" strokeWidth="3.5"></line>
          </svg>
        </symbol>
      )
    },
    probConstraint: {
      typeText: "",
      shapeId: "#probConstraint",
      shape: (
        <symbol viewBox="0 0 50 50" id="probConstraint" key="0" fontSize="18pt" fill='plum'>
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="12" fill="red" strokeWidth="1.5"></circle>
            <line x1="17.5" y1="28" x2="32.5" y2="28" strokeWidth="3.5"></line>
            <line x1="17.5" y1="22" x2="32.5" y2="22" strokeWidth="3.5"></line>
          </svg>
        </symbol>
      )
    },
    relinearize: {
      typeText: "Relin",
      shapeId: "#relinearize",
      shape: (
        <symbol viewBox="0 0 50 50" id="relinearize" key="0">
          <svg viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="12">
            </circle>
          </svg>
        </symbol>
      )
    },
    problematic: {
      typeText: "Problematic",
      shapeId: "#problem", // relates to the type property of a node
      shape: (
        <symbol viewBox="0 0 100 100" id="problem" key="0">
          <circle cx="50" cy="50" r="45" fill='pink'></circle>
        </symbol>
      )
    }
  },
  NodeSubtypes: {},
  EdgeTypes: {
    emptyEdge: {  // required to show empty edges
      shapeId: "#emptyEdge",
      shape: (
        <symbol viewBox="0 0 50 50" id="emptyEdge" key="0">
          <circle cx="25" cy="25" r="8" fill="currentColor"> </circle>
        </symbol>
      )
    }
  }
}



function UberGraph({graph, onSelect, selected}) {
  // const [selected, select] = useState(null);
  console.log('render')
  return (
  <GraphView
    nodeKey="id"
    nodes={graph.nodes}
    edges={graph.edges}
    allowMultiselect={false}
    layoutEngineType='VerticalTree'
    readOnly={true}
    nodeTypes={GraphConfig.NodeTypes}
    edgeTypes={GraphConfig.EdgeTypes}
    nodeSubtypes={GraphConfig.NodeSubtypes}
    onCreateNode={() => {}}
    selected={selected}
    onSwapEdge={() => {}}
    onCreateEdge={() => {}}
    onSelect={onSelect}
  />)
}
export {UberGraph};

