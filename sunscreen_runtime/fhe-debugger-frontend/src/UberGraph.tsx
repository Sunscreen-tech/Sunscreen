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
    input: { // required to show empty nodes
      typeText: "Input",
      shapeId: "#input", // relates to the type property of a node
      shape: (
        <symbol viewBox="0 0 100 100" id="input" key="0">
          <circle cx="50" cy="50" r="45"></circle>
        </symbol>
      )
    },
    output: { // required to show empty nodes
      typeText: "Output",
      shapeId: "#output", // relates to the type property of a node
      shape: (
        <symbol viewBox="0 0 100 100" id="input" key="0">
          <circle cx="50" cy="50" r="45"></circle>
        </symbol>
      )
    },
    custom: { // required to show empty nodes
      typeText: "Custom",
      shapeId: "#custom", // relates to the type property of a node
      shape: (
        <symbol viewBox="0 0 50 25" id="custom" key="0">
          <ellipse cx="50" cy="25" rx="50" ry="25"></ellipse>
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

