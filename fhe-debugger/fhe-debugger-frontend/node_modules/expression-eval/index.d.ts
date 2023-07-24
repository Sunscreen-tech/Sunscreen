import * as jsep from "jsep";

declare function compile(expression: string | jsep.Expression): (context: object) => any;
declare function compileAsync(expression: string | jsep.Expression): (context: object) => Promise<any>;
declare function evaluate(node: jsep.Expression, context: object): any;
declare function evaluateAsync(node: jsep.Expression, context: object): Promise<any>;

export { compile, compileAsync, jsep as parse, evaluate as eval, evaluateAsync as evalAsync };
