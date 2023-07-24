"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseWMSError = parseWMSError;
var _xml = require("@loaders.gl/xml");
function parseWMSError(text, options) {
  var _XMLLoader$parseTextS, _parsedXML$ServiceExc, _parsedXML$ogcServic;
  var parsedXML = (_XMLLoader$parseTextS = _xml.XMLLoader.parseTextSync) === null || _XMLLoader$parseTextS === void 0 ? void 0 : _XMLLoader$parseTextS.call(_xml.XMLLoader, text, options);
  var serviceExceptionXML = (parsedXML === null || parsedXML === void 0 ? void 0 : (_parsedXML$ServiceExc = parsedXML.ServiceExceptionReport) === null || _parsedXML$ServiceExc === void 0 ? void 0 : _parsedXML$ServiceExc.ServiceException) || (parsedXML === null || parsedXML === void 0 ? void 0 : (_parsedXML$ogcServic = parsedXML['ogc:ServiceExceptionReport']) === null || _parsedXML$ogcServic === void 0 ? void 0 : _parsedXML$ogcServic['ogc:ServiceException']);
  var message = typeof serviceExceptionXML === 'string' ? serviceExceptionXML : serviceExceptionXML.value || serviceExceptionXML.code || 'Unknown error';
  return message;
}
//# sourceMappingURL=parse-wms-error.js.map