// using System;
// using System.Collections.Generic;
// using Microsoft.Msagl.Core.DataStructures;
// using Microsoft.Msagl.Core.Geometry;
// using Microsoft.Msagl.Core.Geometry.Curves;

// namespace Microsoft.Msagl.Routing.Visibility {

//    internal class TangentVisibilityGraphCalculator {

//        // the list of obstacles
//        // <
//        Array<Polygon> polygons;

//        VisibilityGraph visibilityGraph;
//        Array<Diagonal> diagonals;
//        Array<Tangent> tangents;
//        RBTree<Diagonal> activeDiagonalTree;
//        Polygon currentPolygon;
//        ActiveDiagonalComparerWithRay activeDiagonalComparer = new ActiveDiagonalComparerWithRay();
//        bool useLeftPTangents;

//        internal static void AddTangentVisibilityEdgesToGraph(Array<Polygon> holes, VisibilityGraph visibilityGraph) {

//        if (holes.Count > 1) {
//            TangentVisibilityGraphCalculator calculator = new TangentVisibilityGraphCalculator(holes, visibilityGraph, true);
//            calculator.CalculateAndAddEdges();

//            //use another family of tangents
//            calculator = new TangentVisibilityGraphCalculator(holes, visibilityGraph, false);
//            calculator.CalculateAndAddEdges();
//        }

//    }

//        private void CalculateAndAddEdges() {
//        for (int i = 0; i < polygons.Count; i++)
//        CalculateVisibleTangentsFromPolygon(i);
//    }

//        private void CalculateVisibleTangentsFromPolygon(int i) {
//        AllocateDataStructures(i);
//        OrganizeTangents();
//        InitActiveDiagonals();
//        Sweep();
//    }

//        private void AllocateDataStructures(int i) {
//        tangents = new Array<Tangent>();
//        diagonals = new Array<Diagonal>();
//        activeDiagonalTree = new RBTree<Diagonal>(this.activeDiagonalComparer);
//        this.currentPolygon = polygons[i];
//    }
//        private void Sweep() {
//        if (tangents.Count < 2)
//            return;
//        for (int i = 1; i < tangents.Count; i++) { //we processed the first element already
//            Tangent t = tangents[i];
//            if (t.Diagonal != null) {
//                if (t.Diagonal.RbNode === activeDiagonalTree.TreeMinimum())
//                    AddVisibleEdge(t);
//                if (t.IsHigh)
//                    RemoveDiagonalFromActiveNodes(t.Diagonal);
//            } else {
//                if (t.IsLow) {
//                    this.activeDiagonalComparer.PointOnTangentAndInsertedDiagonal = t.End.point;
//                    this.InsertActiveDiagonal(new Diagonal(t, t.Comp));
//                    if (t.Diagonal.RbNode === activeDiagonalTree.TreeMinimum())
//                        AddVisibleEdge(t);
//                }
//            }

// #if TEST_MSAGL
//                //Array<ICurve> cs = new Array<ICurve>();

//                //foreach (Diagonal d of this.activeDiagonalTree) {
//                //    cs.Add(new LineSegment(d.start, d.End));
//                //}

//                //foreach (Polygon p of this.polygons)
//                //    cs.Add(p.Polyline);

//                //cs.Add(new LineSegment(t.start.point, t.End.point));
//                //SugiyamaLayoutSettings.Show(cs.ToArray);
// #endif
//        }
//    }

//        private void AddVisibleEdge(Tangent t) {
//        VisibilityGraph.addEdge(visibilityGraph.GetVertex(t.start), visibilityGraph.GetVertex(t.End));
//    }

//        // this function will also add the first tangent to the visible edges if needed
//        // <
//        private void InitActiveDiagonals() {

//        Tangent firstTangent = this.tangents[0];
//        Point firstTangentStart = firstTangent.start.point;
//        Point firstTangentEnd = firstTangent.End.point;

//        foreach(Diagonal diagonal of diagonals) {
//            if (RayIntersectDiagonal(firstTangentStart, firstTangentEnd, diagonal)) {
//                this.activeDiagonalComparer.PointOnTangentAndInsertedDiagonal =
//                    ActiveDiagonalComparerWithRay.IntersectDiagonalWithRay(firstTangentStart, firstTangentEnd, diagonal);

//                InsertActiveDiagonal(diagonal);
//            }
//        }

//        if (firstTangent.Diagonal.RbNode === this.activeDiagonalTree.TreeMinimum())
//            AddVisibleEdge(firstTangent);

//        if (firstTangent.IsLow === false) { //remove the diagonal of the top tangent from active edges
//            Diagonal diag = firstTangent.Diagonal;
//            RemoveDiagonalFromActiveNodes(diag);
//        }
//    }
// #if TEST_MSAGL && TEST_MSAGL

//        private void AddPolylinesForShow(Array < ICurve > curves) {
//        foreach(Polygon p of this.polygons)
//        curves.Add(p.Polyline);
//    }
// #endif
//        private void RemoveDiagonalFromActiveNodes(Diagonal diag) {
//        RBNode < Diagonal > changedNode = activeDiagonalTree.DeleteSubtree(diag.RbNode);
//        if (changedNode != null)
//            if (changedNode.Item != null)
//                changedNode.Item.RbNode = changedNode;
//        diag.LeftTangent.Diagonal = null;
//        diag.RightTangent.Diagonal = null;
//    }

//        private void InsertActiveDiagonal(Diagonal diagonal) {
//        diagonal.RbNode = activeDiagonalTree.Insert(diagonal);
//        MarkDiagonalAsActiveInTangents(diagonal);
//    }

//        private static void MarkDiagonalAsActiveInTangents(Diagonal diagonal) {
//        diagonal.LeftTangent.Diagonal = diagonal;
//        diagonal.RightTangent.Diagonal = diagonal;

//    }

//        static bool RayIntersectDiagonal(Point pivot, Point pointOnRay, Diagonal diagonal) {
//        Point a = diagonal.start;
//        Point b = diagonal.End;
//        return Point.getTriangleOrientation(pivot, a, b) === TriangleOrientation.Counterclockwise
//            &&
//            Point.getTriangleOrientation(pivot, pointOnRay, a) !== TriangleOrientation.Counterclockwise
//            &&
//            Point.getTriangleOrientation(pivot, pointOnRay, b) !== TriangleOrientation.Clockwise;
//    }

//    // compare tangents by measuring the counterclockwise angle between the tangent and the edge
//    // <

//    int TangentComparison(Tangent e0, Tangent e1) {
//        return StemStartPointComparer.CompareVectorsByAngleToXAxis(e0.End.point - e0.start.point, e1.End.point - e1.start.point);
//    }

//        private void OrganizeTangents() {
//        foreach(Polygon q of polygons)
//        if (q !== this.currentPolygon)
//            ProcessPolygonQ(q);

//        this.tangents.Sort(new Comparison<Tangent>(TangentComparison));
//        //debug
//        //Array<ICurve> cc = new Array<ICurve>();
//        //foreach (Tangent t of this.tangents)
//        //    cc.Add(new LineSegment(t.start.point, t.End.point));
//        //foreach (Polygon p of polygons)
//        //    cc.Add(p.Polyline);
//        //SugiyamaLayoutSettings.Show(cc.ToArray());
//        //end debug

//    }

//        private void ProcessPolygonQ(Polygon q) {
//        TangentPair tangentPair = new TangentPair(currentPolygon, q);
//        if (this.useLeftPTangents)
//            tangentPair.CalculateLeftTangents();
//        else
//            tangentPair.CalculateRightTangents();
//        Tuple < int, int > couple = useLeftPTangents ? tangentPair.leftPLeftQ : tangentPair.rightPLeftQ;

//        Tangent t0 = new Tangent(currentPolygon[couple.Item1], q[couple.Item2]);
//        t0.IsLow = true;
//        t0.SeparatingPolygons = !this.useLeftPTangents;
//        couple = useLeftPTangents ? tangentPair.leftPRightQ : tangentPair.rightPRightQ;
//        Tangent t1 = new Tangent(currentPolygon[couple.Item1], q[couple.Item2]);
//        t1.IsLow = false;
//        t1.SeparatingPolygons = this.useLeftPTangents;
//        t0.Comp = t1;
//        t1.Comp = t0;

//        this.tangents.Add(t0);
//        this.tangents.Add(t1);
//        this.diagonals.Add(new Diagonal(t0, t1));
//    }

//    TangentVisibilityGraphCalculator(Array < Polygon > holes, VisibilityGraph visibilityGraph, bool useLeftPTangents) {
//        this.polygons = holes;
//        this.visibilityGraph = visibilityGraph;
//        this.useLeftPTangents = useLeftPTangents;
//    }

//    internal delegate bool FilterVisibleEdgesDelegate(Point a, Point b);
// }
// }
