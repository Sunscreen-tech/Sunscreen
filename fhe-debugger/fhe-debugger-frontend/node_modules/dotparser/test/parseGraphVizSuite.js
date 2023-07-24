var fs = require('fs')
var path = require('path')

var test = require('tap').test;
var parse = require('../');
var suitePath = path.join(__dirname, 'graphs');

if (!fs.existsSync(suitePath)) {
  console.warn('To test against graphviz suite download graphs from ')
  console.warn('  https://github.com/ellson/MOTHBALLED-graphviz/tree/master/rtest/graphs')
  console.warn('and put them into ' + suitePath);
} else {
  testAllFiles();
}

function testAllFiles() {
  readFiles(suitePath, verifyOneFile, reportError);
}

function verifyOneFile(fileName, content) {
  test('it can read ' + fileName, function(t) {
    try {
      parse(content);
    } catch(error) {
      t.fail(error);
    }
    t.end();
  })
}

function reportError(fileName, err) {
  console.error('Failed to read ' + fileName);
  console.error(err);
}

function readFiles(dirname, onFileContent, onError) {
  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    filenames.forEach(function(filename) {
      fs.readFile(path.join(dirname, filename), 'utf-8', function(err, content) {
        if (err) {
          onError(filename, err);
          return;
        }
        onFileContent(filename, content);
      });
    });
  });
}