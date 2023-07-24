export default class Delatin {
    constructor(data: any, width: any, height?: any);
    run(maxError?: number): void;
    refine(): void;
    getMaxError(): any;
    getRMSD(): number;
    heightAt(x: any, y: any): any;
    _flush(): void;
    _findCandidate(p0x: any, p0y: any, p1x: any, p1y: any, p2x: any, p2y: any, t: any): void;
    _step(): void;
    _addPoint(x: any, y: any): number;
    _addTriangle(a: any, b: any, c: any, ab: any, bc: any, ca: any, e?: any): any;
    _legalize(a: any): void;
    _handleCollinear(pn: any, a: any): void;
    _queuePush(t: any, error: any, rms: any): void;
    _queuePop(): any;
    _queuePopBack(): any;
    _queueRemove(t: any): void;
    _queueLess(i: any, j: any): boolean;
    _queueSwap(i: any, j: any): void;
    _queueUp(j0: any): void;
    _queueDown(i0: any, n: any): boolean;
}
//# sourceMappingURL=index.d.ts.map