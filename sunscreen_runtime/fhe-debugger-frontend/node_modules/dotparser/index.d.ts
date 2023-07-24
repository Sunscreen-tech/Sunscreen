declare module 'dotparser' {
  export type CompassPt = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
  export type Stmt = AttrStmt | EdgeStmt | NodeStmt | Subgraph;

  export interface Port {
    type: 'port';
    id: string | number;
    compass_pt?: CompassPt;
  }

  export interface NodeId {
    type: 'node_id';
    id: string | number;
    port?: Port;
  }

  export interface HTMLString {
    type: 'id';
    value: 'string';
    html: true;
  }

  export interface Attr {
    type: 'attr';
    id: string | number;
    eq: string | HTMLString;
  }

  export interface Subgraph {
    type: 'subgraph';
    children: Stmt[];
    id?: string | number;
  }

  export interface AttrStmt {
    type: 'attr_stmt';
    target: 'graph' | 'node' | 'edge';
    attr_list: Attr[];
  }

  export interface EdgeStmt {
    type: 'edge_stmt';
    edge_list: (Subgraph | NodeId)[];
    attr_list: Attr[];
  }

  export interface NodeStmt {
    type: 'node_stmt';
    node_id: NodeId;
    attr_list: Attr[];
  }

  export interface Graph {
    type: 'graph' | 'digraph';
    children: Stmt[];
    strict?: boolean;
    id?: string | number;
  }

  export default function parse(input: string, options?: Record<string, any>): Graph[];
}
