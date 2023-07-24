"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");
Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getAvailablePort = getAvailablePort;
var _child_process = _interopRequireDefault(require("child_process"));
function getAvailablePort() {
  var defaultPort = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 3000;
  return new Promise(function (resolve) {
    _child_process.default.exec('lsof -i -P -n | grep LISTEN', function (error, stdout) {
      if (error) {
        resolve(defaultPort);
        return;
      }
      var portsInUse = [];
      var regex = /:(\d+) \(LISTEN\)/;
      stdout.split('\n').forEach(function (line) {
        var match = regex.exec(line);
        if (match) {
          portsInUse.push(Number(match[1]));
        }
      });
      var port = defaultPort;
      while (portsInUse.includes(port)) {
        port++;
      }
      resolve(port);
    });
  });
}
//# sourceMappingURL=process-utils.js.map