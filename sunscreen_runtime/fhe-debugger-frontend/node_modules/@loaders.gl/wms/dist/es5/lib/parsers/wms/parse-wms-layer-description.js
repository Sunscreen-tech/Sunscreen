"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseWMSLayerDescription = parseWMSLayerDescription;
var _xml = require("@loaders.gl/xml");
function parseWMSLayerDescription(text, options) {
  var _XMLLoader$parseTextS;
  var parsedXML = (_XMLLoader$parseTextS = _xml.XMLLoader.parseTextSync) === null || _XMLLoader$parseTextS === void 0 ? void 0 : _XMLLoader$parseTextS.call(_xml.XMLLoader, text, options);
  return parsedXML;
}
//# sourceMappingURL=parse-wms-layer-description.js.map