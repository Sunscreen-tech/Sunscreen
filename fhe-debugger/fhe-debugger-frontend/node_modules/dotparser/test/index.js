var test = require('tap').test;
var parse = require('../');

test('it can parse empty graph', function (t) {
  var ast = parse('graph {}')[0];
  t.equal(ast.type, 'graph', 'graph type is there');
  t.ok(Array.isArray(ast.children), 'has children array...');
  t.equal(ast.children.length,  0, '...and it is empty');

  t.end();
});

test('it can parse huge graphs', function(t) {
  var linksCount = 10000;
  var lines = ['graph {'];
  for (var i = 0; i < linksCount; ++i) {
    lines.push(i + ' -> ' + (i + 1));
  }
  lines.push('}');
  var graph = lines.join('\n');
  var ast = parse(graph)[0];
  t.equal(ast.children.length, linksCount, 'All edge statements are here');
  t.end();
});

test('it can parse graphs with nodes', function(t) {
  var ast = parse('graph {a; b;}')[0];
  t.equal(ast.children.length, 2, 'Two nodes found');
  t.equal(ast.children[0].type, 'node_stmt', 'Correct type for node');
  t.equal(ast.children[1].type, 'node_stmt', 'Correct type for node');

  t.end();
});

test('it can parse graphs with edges', function(t) {
  var ast = parse('graph {a -> b; b->c}')[0];
  t.equal(ast.children.length, 2, 'Two edges found');
  t.equal(ast.children[0].type, 'edge_stmt', 'Correct type for edge');
  t.equal(ast.children[1].type, 'edge_stmt', 'Correct type for edge');

  t.end();
});

test('it can parse graphs with mixed nodes/edges', function(t) {
  var ast = parse('graph {a -> b; c}')[0];
  t.equal(ast.children.length, 2, 'Two types found');
  t.equal(ast.children[0].type, 'edge_stmt', 'Correct type for edge');
  t.equal(ast.children[1].type, 'node_stmt', 'Correct type for node');

  t.end();
});

test('it can parse graphs with subgraphs', function(t) {
  var ast = parse('graph {{b c}}')[0];
  t.equal(ast.children.length, 1, 'type is found');
  t.equal(ast.children[0].type, 'subgraph', 'Correct type for subgraph');
  t.equal(ast.children[0].children.length, 2, 'Correct number of children in subgraph');

  t.end();
});

test('it can parse graphs with subgraphs containing a node with space before', function(t) {
  var ast = parse('graph {{ a}}')[0];
  t.equal(ast.children.length, 1, 'type is found');
  t.equal(ast.children[0].type, 'subgraph', 'Correct type for subgraph');
  t.equal(ast.children[0].children.length, 1, 'Correct number of children in subgraph');

  t.end();
});

test('it can parse graphs with subgraphs containing a node with space after', function(t) {
  var ast = parse('graph {{a }}')[0];
  t.equal(ast.children.length, 1, 'type is found');
  t.equal(ast.children[0].type, 'subgraph', 'Correct type for subgraph');
  t.equal(ast.children[0].children.length, 1, 'Correct number of children in subgraph');

  t.end();
});

test('it can parse graphs with subgraphs containing only space', function(t) {
  var ast = parse('graph {{ }}')[0];
  t.equal(ast.children.length, 1, 'type is found');
  t.equal(ast.children[0].type, 'subgraph', 'Correct type for subgraph');
  t.equal(ast.children[0].children.length, 0, 'Correct number of children in subgraph');

  t.end();
});

test('it can parse anonymous subgraphs', function(t) {
  var ast = parse('graph { {} }')[0];
  t.equal(ast.type, 'graph', 'graph type is there');
  t.equal(ast.children.length, 1, 'type is found');
  t.equal(ast.children[0].type, 'subgraph', 'Correct type for subgraph');
  t.equal(ast.children[0].children.length, 0, 'Correct number of children in subgraph');

  t.end();
});

test('it can parse named subgraphs', function(t) {
  var ast = parse('graph { subgraph s1 {} }')[0];
  t.equal(ast.type, 'graph', 'graph type is there');
  t.equal(ast.children.length, 1, 'type is found');
  t.equal(ast.children[0].type, 'subgraph', 'Correct type for subgraph');
  t.equal(ast.children[0].children.length, 0, 'Correct number of children in subgraph');

  t.end();
});

test('it can parse multiple anonymous subgraphs', function(t) {
  var ast = parse('graph { {}{} }')[0];
  t.equal(ast.type, 'graph', 'graph type is there');
  t.equal(ast.children.length, 2, 'type is found');
  t.equal(ast.children[0].type, 'subgraph', 'Correct type for subgraph');
  t.equal(ast.children[1].type, 'subgraph', 'Correct type for subgraph');

  t.end();
});

test('it can parse multiple graphs', function (t) {
  var ast = parse('graph a {}\rgraph b {}');

  t.equal(ast.length, 2, 'two graphs');
  t.equal(ast[0].id, 'a', 'graph a is there');
  t.equal(ast[1].id, 'b', 'graph a is there');

  t.end();
});

test('it can read quoted strings', function (t) {
  var ast = parse('graph "G" {}')[0];
  t.equal(ast.type, 'graph', 'graph is there');
  t.equal(ast.id, 'G', 'graph id is there');
  t.ok(Array.isArray(ast.children), 'has children array...');
  t.equal(ast.children.length,  0, '...and it is empty');

  t.end();
});

test('it can read numerics', function (t) {
  var ast = parse('graph 42 {}')[0];
  t.equal(ast.type, 'graph', 'graph is there');
  t.equal(ast.id, 42, 'graph id is there');
  t.ok(Array.isArray(ast.children), 'has children array...');
  t.equal(ast.children.length,  0, '...and it is empty');

  t.end();
});

test('it can read unicode', function (t) {
  var ast = parse('graph こんにちは世界{}')[0];
  t.equal(ast.type, 'graph', 'graph is there');
  t.equal(ast.id, 'こんにちは世界', 'graph id is there');
  t.ok(Array.isArray(ast.children), 'has children array...');
  t.equal(ast.children.length,  0, '...and it is empty');

  t.end();
});

test('it can handle anything within quotes', function (t) {
  var id = "A\t";
  var ast = parse('graph "' + id + '" {}')[0];
  t.equal(ast.type, 'graph', 'graph is there');
  t.equal(ast.id, id, 'graph id is there');
  t.ok(Array.isArray(ast.children), 'has children array...');
  t.equal(ast.children.length,  0, '...and it is empty');

  t.end();
});

test('it escapes only quotes', function (t) {
  // dot file spec tells us to escape only one sequence: \", the rest should be
  // shown as is.
  var id = 'A\\"';
  var ast = parse('graph "' + id + '" {}')[0];
  t.equal(ast.id, 'A"', 'graph id is there');

  // now let's render '\\':
  id = 'A\\\\';
  ast = parse('graph "' + id + '" {}')[0];
  t.equal(ast.id, 'A\\\\', 'graph id is there');

  t.end();
});

test('it parses attributes list', function (t) {
  var ast = parse('digraph { graph [width=0]} ')[0];
  var attribute = ast.children[0].attr_list[0];
  t.equal(attribute.type, 'attr', 'attribute is found');
  t.equal(attribute.id, 'width', 'name is correct');
  t.equal(attribute.eq, 0, 'value is correct');
  t.end();
});

test('it ignore whitespace in attributes list', function (t) {
  // we have empty attributes list, and whitespace between them:
  var ast = parse('digraph { graph [\r]} ')[0];
  t.equal(ast.type, 'digraph', 'graph type is there');
  t.equal(ast.children[0].target, "graph", "attributes are there");
  t.end();
});

test('it ignores comma in attributes list', function (t) {
  var ast = parse('digraph { graph [label=l1,rankdir=TB]} ')[0];
  t.equal(ast.type, 'digraph', 'graph type is there');
  t.equal(ast.children[0].target, "graph", "attributes are there");
  t.end();
});

test('it ignores semicolon in attributes list', function (t) {
  var ast = parse('digraph { graph [label=l1;rankdir=TB]} ')[0];
  t.equal(ast.type, 'digraph', 'graph type is there');
  t.equal(ast.children[0].target, "graph", "attributes are there");
  t.end();
});
