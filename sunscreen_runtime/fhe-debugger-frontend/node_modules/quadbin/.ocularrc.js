const {resolve} = require('path');

const config = {
  lint: {
    paths: ['src', 'test']
  },

  browserTest: {
    server: {wait: 5000}
  },

  entry: {
    test: 'test/node.js',
  }
};

module.exports = config;
