import { LinkedList } from 'linked-list-typescript';
export declare class Stack<T> extends LinkedList<T> {
    constructor(...values: T[]);
    readonly top: T;
    readonly size: number;
    push(val: T): void;
    pop(): T;
}
