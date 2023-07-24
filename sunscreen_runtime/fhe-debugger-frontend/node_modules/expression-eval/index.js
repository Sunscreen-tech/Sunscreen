const jsep = require('jsep');

/**
 * Evaluation code from JSEP project, under MIT License.
 * Copyright (c) 2013 Stephen Oney, http://jsep.from.so/
 */

const binops = {
  '||':  function (a, b) { return a || b; },
  '&&':  function (a, b) { return a && b; },
  '|':   function (a, b) { return a | b; },
  '^':   function (a, b) { return a ^ b; },
  '&':   function (a, b) { return a & b; },
  '==':  function (a, b) { return a == b; }, // jshint ignore:line
  '!=':  function (a, b) { return a != b; }, // jshint ignore:line
  '===': function (a, b) { return a === b; },
  '!==': function (a, b) { return a !== b; },
  '<':   function (a, b) { return a < b; },
  '>':   function (a, b) { return a > b; },
  '<=':  function (a, b) { return a <= b; },
  '>=':  function (a, b) { return a >= b; },
  '<<':  function (a, b) { return a << b; },
  '>>':  function (a, b) { return a >> b; },
  '>>>': function (a, b) { return a >>> b; },
  '+':   function (a, b) { return a + b; },
  '-':   function (a, b) { return a - b; },
  '*':   function (a, b) { return a * b; },
  '/':   function (a, b) { return a / b; },
  '%':   function (a, b) { return a % b; }
};

const unops = {
  '-' :  function (a) { return -a; },
  '+' :  function (a) { return +a; },
  '~' :  function (a) { return ~a; },
  '!' :  function (a) { return !a; },
};

function evaluateArray ( list, context ) {
  return list.map(function (v) { return evaluate(v, context); });
}

async function evaluateArrayAsync( list, context ) {
  const res = await Promise.all(list.map((v) => evaluateAsync(v, context)));
  return res;
}

function evaluateMember ( node, context ) {
  const object = evaluate(node.object, context);
  if ( node.computed ) {
    return [object, object[evaluate(node.property, context)]];
  } else {
    return [object, object[node.property.name]];
  }
}

async function evaluateMemberAsync( node, context ) {
  const object = await evaluateAsync(node.object, context);
  if (  node.computed) {
    return [object, object[await evaluateAsync(node.property, context)]];
  } else {
    return [object, object[node.property.name]];
  }
}

function evaluate ( node, context ) {

  switch ( node.type ) {

    case 'ArrayExpression':
      return evaluateArray( node.elements, context );

    case 'BinaryExpression':
      return binops[ node.operator ]( evaluate( node.left, context ), evaluate( node.right, context ) );

    case 'CallExpression':
      let caller, fn, assign;
      if (node.callee.type === 'MemberExpression') {
        assign = evaluateMember( node.callee, context );
        caller = assign[0];
        fn = assign[1];
      } else {
        fn = evaluate( node.callee, context );
      }
      if (typeof fn  !== 'function') { return undefined; }
      return fn.apply( caller, evaluateArray( node.arguments, context ) );

    case 'ConditionalExpression':
      return evaluate( node.test, context )
        ? evaluate( node.consequent, context )
        : evaluate( node.alternate, context );

    case 'Identifier':
      return context[node.name];

    case 'Literal':
      return node.value;

    case 'LogicalExpression':
      if (node.operator === '||') {
        return evaluate( node.left, context ) || evaluate( node.right, context );
      } else if (node.operator === '&&') {
        return evaluate( node.left, context ) && evaluate( node.right, context );
      }
      return binops[ node.operator ]( evaluate( node.left, context ), evaluate( node.right, context ) );

    case 'MemberExpression':
      return evaluateMember(node, context)[1];

    case 'ThisExpression':
      return context;

    case 'UnaryExpression':
      return unops[ node.operator ]( evaluate( node.argument, context ) );

    default:
      return undefined;
  }

}

async function evaluateAsync( node, context ) {

  switch ( node.type ) {

    case 'ArrayExpression':
      return await evaluateArrayAsync( node.elements, context );

    case 'BinaryExpression': {
      const [left, right] = await Promise.all([
        evaluateAsync( node.left, context ),
        evaluateAsync( node.right, context )
      ]);
      return binops[ node.operator ]( left, right );
    }

    case 'CallExpression':
      let caller, fn, assign;
      if (node.callee.type === 'MemberExpression') {
        assign = await evaluateMemberAsync( node.callee, context );
        caller = assign[0];
        fn = assign[1];
      } else {
        fn = await evaluateAsync( node.callee, context );
      }
      if (typeof fn !== 'function') {
        return undefined;
      }
      return await fn.apply(
        caller,
        await evaluateArrayAsync( node.arguments, context )
      );

    case 'ConditionalExpression':
      return (await evaluateAsync( node.test, context ))
        ? await evaluateAsync( node.consequent, context )
        : await evaluateAsync( node.alternate, context );

    case 'Identifier':
      return context[node.name];

    case 'Literal':
      return node.value;

    case 'LogicalExpression': {
      if (node.operator === '||') {
        return (
          (await evaluateAsync( node.left, context )) ||
          (await evaluateAsync( node.right, context ))
        );
      } else if (node.operator === '&&') {
        return (
          (await evaluateAsync( node.left, context )) &&
          (await evaluateAsync( node.right, context ))
        );
      }

      const [left, right] = await Promise.all([
        evaluateAsync( node.left, context ),
        evaluateAsync( node.right, context )
      ]);

      return binops[ node.operator ]( left, right );
    }

    case 'MemberExpression':
      return (await evaluateMemberAsync(node, context))[1];

    case 'ThisExpression':
      return context;

    case 'UnaryExpression':
      return unops[ node.operator ](await evaluateAsync( node.argument, context ));

    default:
      return undefined;
  }
}

function compile (expression) {
  return evaluate.bind(null, jsep(expression));
}

function compileAsync(expression) {
  return evaluateAsync.bind(null, jsep(expression));
}

module.exports = {
  parse: jsep,
  eval: evaluate,
  evalAsync: evaluateAsync,
  compile: compile,
  compileAsync: compileAsync
};
