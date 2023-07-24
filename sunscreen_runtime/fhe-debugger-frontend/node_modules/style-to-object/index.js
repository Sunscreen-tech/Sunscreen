var parse = require('css/lib/parse');

/**
 * Parses inline style.
 *
 * Example: 'color:red' => { color: 'red' }
 *
 * @param  {String}      style      - The inline style.
 * @param  {Function}    [iterator] - The iterator function.
 * @return {null|Object}
 */
module.exports = function parseInlineStyle(style, iterator) {
  if (!style || typeof style !== 'string') return null;

  // make sure to wrap declarations in placeholder
  var declarations = parse('p{' + style + '}').stylesheet.rules[0].declarations;
  var declaration, property, value;

  var output = null;
  var hasIterator = typeof iterator === 'function';

  for (var i = 0, len = declarations.length; i < len; i++) {
    declaration = declarations[i];
    property = declaration.property;
    value = declaration.value;

    if (hasIterator) {
      iterator(property, value, declaration);
    } else if (value) {
      output || (output = {});
      output[property] = value;
    }
  }

  return output;
};
