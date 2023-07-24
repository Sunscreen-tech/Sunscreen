"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseJSON = parseJSON;
var _getFirstCharacters = require("../binary-utils/get-first-characters");
function parseJSON(string) {
  try {
    return JSON.parse(string);
  } catch (_) {
    throw new Error("Failed to parse JSON from data starting with \"".concat((0, _getFirstCharacters.getFirstCharacters)(string), "\""));
  }
}
//# sourceMappingURL=parse-json.js.map