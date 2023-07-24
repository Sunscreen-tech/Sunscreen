import {BasicGraph} from '../../../structs/BasicGraph'
import {IntPairMap} from '../../../utils/IntPairMap'
import {GeomGraph} from '../../core/geomGraph'
import {GeomNode} from '../../core/geomNode'
import {Database} from '../Database'
import {HorizontalConstraintsForSugiyama} from '../HorizontalConstraintsForSugiyama'
import {LayerArrays} from '../LayerArrays'
import {PolyIntEdge} from '../polyIntEdge'
import {ProperLayeredGraph} from '../ProperLayeredGraph'
import {SugiyamaLayoutSettings} from '../sugiyamaLayoutSettings'
import {AdjacentSwapsWithConstraints} from './adjacentSwapsWithConstraints'
import {LayerInfo} from './layerInfo'
import {GetCrossingsTotal} from './ordering'
import {Node} from '../../../structs/node'

export class ConstrainedOrdering {
  geometryGraph: GeomGraph

  intGraph: BasicGraph<Node, PolyIntEdge>

  ProperLayeredGraph: ProperLayeredGraph

  initialLayering: number[]

  layerInfos: LayerInfo[]

  LayerArrays: LayerArrays

  horizontalConstraints: HorizontalConstraintsForSugiyama

  numberOfNodesOfProperGraph: number

  database: Database

  xPositions: number[][]

  yetBestLayers: number[][]

  verticalEdges: Array<PolyIntEdge> = new Array<PolyIntEdge>()

  adjSwapper: AdjacentSwapsWithConstraints

  settings: SugiyamaLayoutSettings

  numberOfLayers = -1

  noGainSteps: number

  static MaxNumberOfNoGainSteps = 5

  get NumberOfLayers(): number {
    throw new Error('not implemented')
    if (this.numberOfLayers > 0) {
      return this.numberOfLayers
    }

    return 0
  }

  NodeSeparation(): number {
    return this.settings.NodeSeparation
  }

  constructor(
    geomGraph: GeomGraph,
    basicIntGraph: BasicGraph<GeomNode, PolyIntEdge>,
    layering: number[],
    nodeIdToIndex: Map<string, number>,
    database: Database,
    settings: SugiyamaLayoutSettings,
  ) {
    throw new Error('not implemented')
    // this.settings = this.settings;
    // this.horizontalConstraints = this.settings.HorizontalConstraints;
    // this.horizontalConstraints.PrepareForOrdering(nodeIdToIndex, layering);
    // this.geometryGraph = geomGraph;
    // this.database = this.database;
    // this.intGraph = basicIntGraph;
    // this.initialLayering = layering;
    // // this has to be changed only to insert layers that are needed
    // if (this.NeedToInsertLayers(layering)) {
    //  for (let i= 0; (i < layering.length); i++) {
    //    layering[i] = (layering[i] * 2);
    //  }

    //  this.LayersAreDoubled = true;
    //  this.numberOfLayers = -1;
    // }

    // this.PrepareProperLayeredGraphAndFillLayerInfos();
    // this.adjSwapper = new AdjacentSwapsWithConstraints(this.LayerArrays, this.HasCrossWeights(), this.ProperLayeredGraph, this.layerInfos);
  }

  layersAreDoubled = false
  get LayersAreDoubled(): boolean {
    return this.layersAreDoubled
  }
  set LayersAreDoubled(value: boolean) {
    this.layersAreDoubled = value
  }

  NeedToInsertLayers(layering: number[]): boolean {
    return (
      ConstrainedOrdering.ExistsShortLabeledEdge(layering, Array.from(this.intGraph.edges)) ||
      ConstrainedOrdering.ExistsShortMultiEdge(layering, this.database.Multiedges)
    )
  }

  static ExistsShortMultiEdge(layering: number[], multiedges: IntPairMap<Array<PolyIntEdge>>): boolean {
    return Array.from(multiedges.keyValues()).some(([k, v]) => v.length > 2 && layering[k.x] === 1 + layering[k.y])
  }

  // Calculate() {
  //  this.AllocateXPositions();
  //  let originalGraph = (<GeomGraph>(this.intGraph.Nodes[0].GeometryParent));
  //  LayeredLayoutEngine.CalculateAnchorSizes(this.database, TODOOUTthis.database.anchors, this.ProperLayeredGraph, originalGraph, this.intGraph, this.settings);
  //  LayeredLayoutEngine.CalcInitialYAnchorLocations(this.LayerArrays, 500, this.geometryGraph, this.database, this.intGraph, this.settings, this.LayersAreDoubled);
  //  this.Order();
  // }

  CreateMeasure(): number {
    return GetCrossingsTotal(this.ProperLayeredGraph, this.LayerArrays)
  }

  HasCrossWeights(): boolean {
    for (const le of this.ProperLayeredGraph.Edges) {
      if (le.CrossingWeight !== 1) return true
    }
    return false
  }

  static ExistsShortLabeledEdge(layering: number[], edges: Array<PolyIntEdge>): boolean {
    return edges.some((edge) => layering[edge.source] === layering[edge.target] + 1 && edge.edge.label != null)
  }

  AllocateXPositions() {
    this.xPositions = new Array(this.NumberOfLayers)
    for (let i = 0; i < this.NumberOfLayers; i++) {
      this.xPositions[i] = new Array(this.LayerArrays.Layers[i].length)
    }
  }

  Order() {
    throw new Error('not implemented')
    // this.CreateInitialOrderInLayers();
    // this.TryPushingOutStrangersFromHorizontalBlocks();
    // let n= 5;
    // let measure = Number.MAX_SAFE_INTEGER;
    // while (n-- > 0 && this.noGainSteps <= ConstrainedOrdering.MaxNumberOfNoGainSteps) {
    //  this.SetXPositions();
    //  let newMeasure = this.CreateMeasure();
    //  if (newMeasure < measure) {
    //    this.noGainSteps = 0;
    //    const t = { layerArraysCopy: this.yetBestLayers }
    //    Ordering.CloneLayers(this.LayerArrays.Layers, t);
    //    this.yetBestLayers = t.layerArraysCopy
    //    measure = newMeasure;
    //  }
    //  else {
    //    this.noGainSteps++;
    //    this.RestoreState();
    //  }

    // }
  }

  SetXPositions() {
    throw new Error('not implemented')
  }

  // InitSolverWithoutOrder(): ISolverShell {
  //  let solver: ISolverShell = ConstrainedOrdering.CreateSolver();
  //  this.InitSolverVars(solver);
  //  this.PutLeftRightConstraintsIntoSolver(solver);
  //  this.PutVerticalConstraintsIntoSolver(solver);
  //  this.AddGoalsToKeepProperEdgesShort(solver);
  //  this.AddGoalsToKeepFlatEdgesShort(solver);
  //  return solver;
  // }

  // SortLayers(solver: ISolverShell) {
  //  for (let i= 0; (i < this.LayerArrays.Layers.length); i++) {
  //    this.SortLayerBasedOnSolution(this.LayerArrays.Layers[i], solver);
  //  }

  // }

  // AddGoalsToKeepFlatEdgesShort(solver: ISolverShell) {
  //  for (let layerInfo of this.layerInfos) {
  //    ConstrainedOrdering.AddGoalToKeepFlatEdgesShortOnBlockLevel(layerInfo, solver);
  //  }

  // }

  // InitSolverVars(solver: ISolverShell) {
  //  for (let i= 0; (i < this.LayerArrays.y.length); i++) {
  //    solver.AddVariableWithIdealPosition(i, 0);
  //  }

  // }

  // AddGoalsToKeepProperEdgesShort(solver: ISolverShell) {
  //  for (let edge of this.ProperLayeredGraph.edges) {
  //    solver.AddGoalTwoVariablesAreClose(edge.Source, edge.Target, PositionOverBaricenterWeight);
  //  }

  // }

  // PutVerticalConstraintsIntoSolver(solver: ISolverShell) {
  //  for (let pair of this.horizontalConstraints.VerticalInts) {
  //    solver.AddGoalTwoVariablesAreClose(pair.Item1, pair.Item2, ConstrainedVarWeight);
  //  }

  // }

  // PutLeftRightConstraintsIntoSolver(solver: ISolverShell) {
  //  for (let pair of this.horizontalConstraints.LeftRighInts) {
  //    solver.AddLeftRightSeparationConstraint(pair.Item1, pair.Item2, this.SimpleGapBetweenTwoNodes(pair.Item1, pair.Item2));
  //  }

  // }

  // PutLayerNodeSeparationsIntoSolver(solver: ISolverShell) {
  //  for (let layer of this.LayerArrays.Layers) {
  //    for (let i= 0; (i
  //      < (layer.length - 1)); i++) {
  //      let l: number = layer[i];
  //      let r: number = layer[(i + 1)];
  //      solver.AddLeftRightSeparationConstraint(l, r, this.SimpleGapBetweenTwoNodes(l, r));
  //    }

  //  }

  // }

  // ImproveWithAdjacentSwaps() {
  //  this.adjSwapper.DoSwaps();
  // }

  // TryPushingOutStrangersFromHorizontalBlocks() {

  // }

  // CreateInitialOrderInLayers() {
  //  // the idea is to topologically ordering all nodes horizontally, by using vertical components, then fill the layers according to this order
  //  let nodesToVerticalComponentsRoots: Map<number, number> = this.CreateVerticalComponents();
  //  let liftedLeftRightRelations: Array<IntPair> = this.LiftLeftRightRelationsToComponentRoots(nodesToVerticalComponentsRoots).ToArray();
  //  let orderOfVerticalComponentRoots: number[] = TopologicalSort.GetOrderOnEdges(liftedLeftRightRelations);
  //  this.FillLayersWithVerticalComponentsOrder(orderOfVerticalComponentRoots, nodesToVerticalComponentsRoots);
  //  this.LayerArrays.UpdateXFromLayers();
  // }

  // FillLayersWithVerticalComponentsOrder(order: number[], nodesToVerticalComponentsRoots: Map<number, number>) {
  //  let componentRootsToComponents: Map<number, Array<number>> = ConstrainedOrdering.CreateComponentRootsToComponentsMap(nodesToVerticalComponentsRoots);
  //  let alreadyInLayers = new Array(this.LayerArrays.y.length);
  //  let runninglayerCounts = new Array(this.LayerArrays.Layers.length);
  //  for (let vertCompRoot of order) {
  //    this.PutVerticalComponentIntoLayers(this.EnumerateVertComponent(componentRootsToComponents, vertCompRoot), runninglayerCounts, alreadyInLayers);
  //  }

  //  for (let i= 0; (i < this.ProperLayeredGraph.NodeCount); i++) {
  //    if ((alreadyInLayers[i] === false)) {
  //      this.AddVertToLayers(i, runninglayerCounts, alreadyInLayers);
  //    }

  //  }

  // }

  // EnumerateVertComponent(componentRootsToComponents: Map<number, Array<number>>, vertCompRoot: number): Array<number> {
  //  let compList: Array<number>;
  //  if (componentRootsToComponents.TryGetValue(vertCompRoot, TODOOUTcompList)) {
  //    for (let i of compList) {
  //      yield;
  //    }

  //    return i;
  //  }
  //  else {
  //    yield;
  //  }

  //  return vertCompRoot;
  // }

  // PutVerticalComponentIntoLayers(vertComponent: Array<number>, runningLayerCounts: number[], alreadyInLayers: boolean[]) {
  //  for (let i of vertComponent) {
  //    this.AddVertToLayers(i, runningLayerCounts, alreadyInLayers);
  //  }

  // }

  // AddVertToLayers(i: number, runningLayerCounts: number[], alreadyInLayers: boolean[]) {
  //  if (alreadyInLayers[i]) {
  //    return;
  //  }

  //  let layerIndex: number = this.LayerArrays.y[i];
  //  let xIndex: number = runningLayerCounts[layerIndex];
  //  let layer = this.LayerArrays.Layers[layerIndex];
  //  layer[xIndex++] = i;
  //  alreadyInLayers[i] = true;
  //  let block: Array<number>;
  //  if (this.horizontalConstraints.BlockRootToBlock.TryGetValue(i, TODOOUTblock)) {
  //    for (let v of block) {
  //      if (alreadyInLayers[v]) {
  //        continue
  //      }

  //      layer[xIndex++] = v;
  //      alreadyInLayers[v] = true;
  //    }

  //  }

  //  runningLayerCounts[layerIndex] = xIndex;
  // }

  // static CreateComponentRootsToComponentsMap(nodesToVerticalComponentsRoots: Map<number, number>): Map<number, Array<number>> {
  //  let d = new Map<number, Array<number>>();
  //  for (let kv of nodesToVerticalComponentsRoots) {
  //    let i: number = kv.Key;
  //    let root = kv.Value;
  //    let component: Array<number>;
  //    if (!d.TryGetValue(root, TODOOUTcomponent)) {
  //      component = new Array<number>();
  //      d[root] = new Array<number>();
  //    }

  //    component.Add(i);
  //  }

  //  return d;
  // }

  // LiftLeftRightRelationsToComponentRoots(nodesToVerticalComponentsRoots: Map<number, number>): Array<IntPair> {
  //  for (let pair of this.horizontalConstraints.LeftRighInts) {
  //    yield;
  //  }

  //  return new IntPair(ConstrainedOrdering.GetFromDictionaryOrIdentical(nodesToVerticalComponentsRoots, pair.Item1), ConstrainedOrdering.GetFromDictionaryOrIdentical(nodesToVerticalComponentsRoots, pair.Item2));
  //  for (let pair of this.horizontalConstraints.LeftRightIntNeibs) {
  //    yield;
  //  }

  //  return new IntPair(ConstrainedOrdering.GetFromDictionaryOrIdentical(nodesToVerticalComponentsRoots, pair.Item1), ConstrainedOrdering.GetFromDictionaryOrIdentical(nodesToVerticalComponentsRoots, pair.Item2));
  // }

  // static GetFromDictionaryOrIdentical(d: Map<number, number>, key: number): number {
  //  let i: number;
  //  if (d.TryGetValue(key, TODOOUTi)) {
  //    return i;
  //  }

  //  return key;
  // }

  // // These blocks are connected components in the vertical constraints. They don't necesserely span consequent layers.
  //

  // CreateVerticalComponents(): Map<number, number> {
  //  let vertGraph = new BasicGraphOnEdges<PolyIntEdge>(from, pair, in, this.horizontalConstraints.VerticalInts, select, new PolyIntEdge(pair.Item1, pair.Item2));
  //  let verticalComponents = ConnectedComponentCalculator.GetComponents(vertGraph);
  //  let nodesToComponentRoots = new Map<number, number>();
  //  for (let component of verticalComponents) {
  //    let ca = component.ToArray();
  //    if ((ca.length === 1)) {
  //      continue
  //    }

  //    let componentRoot: number = -1;
  //    for (let j of component) {
  //      if ((componentRoot === -1)) {
  //        componentRoot = j;
  //      }

  //      nodesToComponentRoots[j] = componentRoot;
  //    }

  //  }

  //  return nodesToComponentRoots;
  // }

  // RestoreState() {
  //  this.LayerArrays.UpdateLayers(this.yetBestLayers);
  // }

  // Show() {
  //  SugiyamaLayoutSettings.ShowDatabase(this.database);
  // }

  // static PrintPositions(positions: number[]) {
  //  for (let j= 0; (j < positions.length); j++) {
  //    System.Diagnostics.Debug.Write((" " + positions[j]));
  //  }

  //  System.Diagnostics.Debug.WriteLine("");
  // }

  // SortLayerBasedOnSolution(layer: number[], solver: ISolverShell) {
  //  let length: number = layer.length;
  //  let positions = new Array(length);
  //  let k= 0;
  //  for (let v: number of layer) {
  //    positions[k++] = solver.GetVariableResolvedPosition(v);
  //  }

  //  Array.Sort(positions, layer);
  //  let i= 0;
  //  for (let v: number of layer) {
  //    i++;
  //  }

  //  this.LayerArrays.x[v] = i;
  // }

  //      /* const */ static ConstrainedVarWeight= 10000000;

  //      /* const */ static PositionOverBaricenterWeight= 5;

  // static NodeToBlockRootSoftOnLayerInfo(layerInfo: LayerInfo, node: number): number {
  //  let root: number;
  //  return layerInfo.nodeToBlockRoot.TryGetValue(node, TODOOUTroot);
  //  // TODO: Warning!!!, inline IF is not supported ?
  //  // TODO: Warning!!!! NULL EXPRESSION DETECTED...
  //  ;
  // }

  // static AddGoalToKeepFlatEdgesShortOnBlockLevel(layerInfo: LayerInfo, solver: ISolverShell) {
  //  if ((layerInfo != null)) {
  //    for (let couple of layerInfo.flatEdges) {
  //      let sourceBlockRoot: number = ConstrainedOrdering.NodeToBlockRootSoftOnLayerInfo(layerInfo, couple.Item1);
  //      let targetBlockRoot: number = ConstrainedOrdering.NodeToBlockRootSoftOnLayerInfo(layerInfo, couple.Item2);
  //      if ((sourceBlockRoot !== targetBlockRoot)) {
  //        solver.AddGoalTwoVariablesAreClose(sourceBlockRoot, targetBlockRoot);
  //      }

  //    }

  //  }

  // }

  // static NodeIsConstrainedBelow(v: number, layerInfo: LayerInfo): boolean {
  //  if ((layerInfo == null )) {
  //    return false;
  //  }

  //  return layerInfo.constrainedFromBelow.ContainsKey(v);
  // }

  // static NodeIsConstrainedAbove(v: number, layerInfo: LayerInfo): boolean {
  //  if ((layerInfo == null )) {
  //    return false;
  //  }

  //  return layerInfo.constrainedFromAbove.ContainsKey(v);
  // }

  static BelongsToNeighbBlock(p: number, layerInfo: LayerInfo): boolean {
    return layerInfo != null && (layerInfo.nodeToBlockRoot.has(p) || layerInfo.neigBlocks.has(p))
    // p is a root of the block
  }

  // static NodesAreConstrainedBelow(leftNode: number, rightNode: number, layerInfo: LayerInfo): boolean {
  //  return (ConstrainedOrdering.NodeIsConstrainedBelow(leftNode, layerInfo) && ConstrainedOrdering.NodeIsConstrainedBelow(rightNode, layerInfo));
  // }

  // static NodesAreConstrainedAbove(leftNode: number, rightNode: number, layerInfo: LayerInfo): boolean {
  //  return (ConstrainedOrdering.NodeIsConstrainedAbove(leftNode, layerInfo) && ConstrainedOrdering.NodeIsConstrainedAbove(rightNode, layerInfo));
  // }

  // GetGapFromNodeNodesConstrainedBelow(leftNode: number, rightNode: number, layerInfo: LayerInfo, layerIndex: number): number {
  //  let gap: number = this.SimpleGapBetweenTwoNodes(leftNode, rightNode);
  //  leftNode = layerInfo.constrainedFromBelow[leftNode];
  //  rightNode = layerInfo.constrainedFromBelow[rightNode];
  //  layerIndex--;
  //  layerInfo = this.layerInfos[layerIndex];
  //  if (((layerIndex > 0)
  //    && ConstrainedOrdering.NodesAreConstrainedBelow(leftNode, rightNode, layerInfo))) {
  //    return Math.Max(gap, this.GetGapFromNodeNodesConstrainedBelow(leftNode, rightNode, layerInfo, layerIndex));
  //  }

  //  return Math.Max(gap, this.SimpleGapBetweenTwoNodes(leftNode, rightNode));
  // }

  // GetGapFromNodeNodesConstrainedAbove(leftNode: number, rightNode: number, layerInfo: LayerInfo, layerIndex: number): number {
  //  let gap: number = this.SimpleGapBetweenTwoNodes(leftNode, rightNode);
  //  leftNode = layerInfo.constrainedFromAbove[leftNode];
  //  rightNode = layerInfo.constrainedFromAbove[rightNode];
  //  layerIndex++;
  //  layerInfo = this.layerInfos[layerIndex];
  //  if (((layerIndex
  //    < (this.LayerArrays.Layers.length - 1))
  //    && ConstrainedOrdering.NodesAreConstrainedAbove(leftNode, rightNode, layerInfo))) {
  //    return Math.Max(gap, this.GetGapFromNodeNodesConstrainedAbove(leftNode, rightNode, layerInfo, layerIndex));
  //  }

  //  return Math.Max(gap, this.SimpleGapBetweenTwoNodes(leftNode, rightNode));
  // }

  // SimpleGapBetweenTwoNodes(leftNode: number, rightNode: number): number {
  //  return (this.database.anchors[leftNode].rightAnchor
  //    + (this.NodeSeparation() + this.database.anchors[rightNode].leftAnchor));
  // }

  // static CreateSolver(): ISolverShell {
  //  return new SolverShell();
  // }

  // PrepareProperLayeredGraphAndFillLayerInfos() {
  //  this.layerInfos = new Array(this.NumberOfLayers);
  //  this.CreateProperLayeredGraph();
  //  this.CreateExtendedLayerArrays();
  //  this.FillBlockRootToBlock();
  //  this.FillLeftRightPairs();
  //  this.FillFlatEdges();
  //  this.FillAboveBelow();
  //  this.FillBlockRootToVertConstrainedNode();
  // }

  // FillBlockRootToVertConstrainedNode() {
  //  for (let layerInfo: LayerInfo of this.layerInfos) {
  //    for (let v: number of ConstrainedOrdering.VertConstrainedNodesOfLayer(layerInfo)) {
  //      let blockRoot: number;
  //      if (ConstrainedOrdering.TryGetBlockRoot(v, TODOOUTblockRoot, layerInfo)) {
  //        layerInfo.blockRootToVertConstrainedNodeOfBlock[blockRoot] = v;
  //      }

  //    }

  //  }

  // }

  // static TryGetBlockRoot(v: number, TODOOUTblockRoot: number, layerInfo: LayerInfo): boolean {
  //  if (layerInfo.nodeToBlockRoot.TryGetValue(v, TODOOUTblockRoot)) {
  //    return true;
  //  }

  //  if (layerInfo.neigBlocks.ContainsKey(v)) {
  //    blockRoot = v;
  //    return true;
  //  }

  //  return false;
  // }

  // static VertConstrainedNodesOfLayer(layerInfo: LayerInfo): Array<number> {
  //  if ((layerInfo != null)) {
  //    for (let v: number of layerInfo.constrainedFromAbove.Keys) {
  //      yield;
  //    }

  //    return v;
  //    for (let v: number of layerInfo.constrainedFromBelow.Keys) {
  //      yield;
  //    }

  //    return v;
  //  }

  // }

  // CreateExtendedLayerArrays() {
  //  let layeringExt = new Array(this.numberOfNodesOfProperGraph);
  //  Array.Copy(this.initialLayering, layeringExt, this.initialLayering.length);
  //  for (let edge: PolyIntEdge of this.ProperLayeredGraph.BaseGraph.edges) {
  //    let ledges = (<LayerEdge[]>(edge.LayerEdges));
  //    if (((ledges != null)
  //      && (ledges.length > 1))) {
  //      let layerIndex: number = (this.initialLayering[edge.Source] - 1);
  //      for (let i= 0; (i
  //        < (ledges.length - 1)); i++) {
  //        // TODO: Warning!!!! NULL EXPRESSION DETECTED...
  //        --;
  //      }

  //    }

  //  }

  //  this.LayerArrays = new LayerArrays(layeringExt);
  // }

  // CreateProperLayeredGraph() {
  //  let edges: Array<PolyIntEdge> = this.CreatePathEdgesOnIntGraph();
  //  let nodeCount = Math.Max(this.intGraph.NodeCount, BasicGraph.VertexCount(edges));
  //  let baseGraph = new BasicGraph<Node, PolyIntEdge>(edges, nodeCount);
  //  this.ProperLayeredGraph = new ProperLayeredGraph(baseGraph);
  // }

  // CreatePathEdgesOnIntGraph(): Array<PolyIntEdge> {
  //  this.numberOfNodesOfProperGraph = this.intGraph.NodeCount;
  //  let ret = new Array<PolyIntEdge>();
  //  for (let ie: PolyIntEdge of this.intGraph.edges) {
  //    if ((this.initialLayering[ie.Source] > this.initialLayering[ie.Target])) {
  //      this.CreateLayerEdgesUnderIntEdge(ie);
  //      ret.Add(ie);
  //      if (this.horizontalConstraints.VerticalInts.Contains(new Tuple<number, number>(ie.Source, ie.Target))) {
  //        this.verticalEdges.Add(ie);
  //      }

  //    }

  //  }

  //  return ret;
  // }

  // CreateLayerEdgesUnderIntEdge(ie: PolyIntEdge) {
  //  let source: number = ie.Source;
  //  let target: number = ie.Target;
  //  let span: number = LayeredLayoutEngine.EdgeSpan(this.initialLayering, ie);
  //  ie.LayerEdges = new Array(span);
  //  Assert.assert((span > 0));
  //  if ((span === 1)) {
  //    ie.LayerEdges[0] = new LayerEdge(ie.Source, ie.Target, ie.CrossingWeight);
  //  }
  //  else {
  //    ie.LayerEdges[0] = new LayerEdge(source, this.numberOfNodesOfProperGraph, ie.CrossingWeight);
  //    for (let i= 0; (i
  //      < (span - 2)); i++) {
  //      ie.LayerEdges[(i + 1)] = new LayerEdge(numberOfNodesOfProperGraph++, this.numberOfNodesOfProperGraph, ie.CrossingWeight);
  //    }

  //    ie.LayerEdges[(span - 1)] = new LayerEdge(numberOfNodesOfProperGraph++, target, ie.CrossingWeight);
  //  }

  // }

  // FillAboveBelow() {
  //  for (let ie: PolyIntEdge of this.verticalEdges) {
  //    for (let le: LayerEdge of ie.LayerEdges) {
  //      let upper: number = le.Source;
  //      let lower: number = le.Target;
  //      this.RegisterAboveBelowOnConstrainedUpperLower(upper, lower);
  //    }

  //  }

  //  for (let p of this.horizontalConstraints.VerticalInts) {
  //    this.RegisterAboveBelowOnConstrainedUpperLower(p.Item1, p.Item2);
  //  }

  // }

  // RegisterAboveBelowOnConstrainedUpperLower(upper: number, lower: number) {
  //  let topLayerInfo: LayerInfo = this.GetOrCreateLayerInfo(this.LayerArrays.y[upper]);
  //  let bottomLayerInfo: LayerInfo = this.GetOrCreateLayerInfo(this.LayerArrays.y[lower]);
  //  topLayerInfo.constrainedFromBelow[upper] = lower;
  //  bottomLayerInfo.constrainedFromAbove[lower] = upper;
  // }

  // FillFlatEdges() {
  //  for (let edge: PolyIntEdge of this.intGraph.edges) {
  //    let l: number = this.initialLayering[edge.Source];
  //    if ((l === this.initialLayering[edge.Target])) {
  //      this.GetOrCreateLayerInfo(l).flatEdges.Insert(new Tuple<number, number>(edge.Source, edge.Target));
  //    }

  //  }

  // }

  // FillLeftRightPairs() {
  //  for (let p of this.horizontalConstraints.LeftRighInts) {
  //    let layerInfo: LayerInfo = this.GetOrCreateLayerInfo(this.initialLayering[p.Item1]);
  //    layerInfo.leftRight.Insert(p);
  //  }

  // }

  // // when we call this function we know that a LayerInfo is needed
  //

  // GetOrCreateLayerInfo(layerNumber: number): LayerInfo {
  //  let layerInfo: LayerInfo;
  //  new LayerInfo();
  //  return layerInfo;
  // }

  // FillBlockRootToBlock() {
  //  for (let p of this.horizontalConstraints.BlockRootToBlock) {
  //    let layerInfo: LayerInfo = this.GetOrCreateLayerInfo(this.initialLayering[p.Key]);
  //    layerInfo.neigBlocks[p.Key] = p.Value;
  //    for (let i: number of p.Value) {
  //      layerInfo.nodeToBlockRoot[i] = p.Key;
  //    }

  //  }

  // }
}
