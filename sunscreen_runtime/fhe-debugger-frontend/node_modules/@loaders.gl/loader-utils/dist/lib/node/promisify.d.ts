/** Wrapper for Node.js promisify */
type Callback<A> = (error: unknown, args: A) => void;
/**
 * Typesafe promisify implementation
 * @link https://dev.to/_gdelgado/implement-a-type-safe-version-of-node-s-promisify-in-7-lines-of-code-in-typescript-2j34
 * @param fn
 * @returns
 */
export declare function promisify1<T, A>(fn: (args: T, cb: Callback<A>) => void): (args: T) => Promise<A>;
export declare function promisify2<T1, T2, A>(fn: (arg1: T1, arg2: T2, cb: Callback<A>) => void): (arg1: T1, arg2: T2) => Promise<A>;
export declare function promisify3<T1, T2, T3, A>(fn: (arg1: T1, arg2: T2, arg3: T3, cb: Callback<A>) => void): (arg1: T1, arg2: T2, arg3: T3) => Promise<A>;
export {};
//# sourceMappingURL=promisify.d.ts.map