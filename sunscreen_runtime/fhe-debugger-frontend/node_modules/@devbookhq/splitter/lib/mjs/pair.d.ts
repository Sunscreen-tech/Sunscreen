export default interface Pair {
    idx: number;
    a: HTMLElement;
    b: HTMLElement;
    gutter: HTMLElement;
    parent: HTMLElement;
    start?: number;
    end?: number;
    size?: number;
    gutterSize?: number;
    aSizePct: number;
    bSizePct: number;
}
