import { XMLLoader } from '@loaders.gl/xml';
export function parseWMSError(text, options) {
  var _XMLLoader$parseTextS, _parsedXML$ServiceExc, _parsedXML$ogcServic;
  const parsedXML = (_XMLLoader$parseTextS = XMLLoader.parseTextSync) === null || _XMLLoader$parseTextS === void 0 ? void 0 : _XMLLoader$parseTextS.call(XMLLoader, text, options);
  const serviceExceptionXML = (parsedXML === null || parsedXML === void 0 ? void 0 : (_parsedXML$ServiceExc = parsedXML.ServiceExceptionReport) === null || _parsedXML$ServiceExc === void 0 ? void 0 : _parsedXML$ServiceExc.ServiceException) || (parsedXML === null || parsedXML === void 0 ? void 0 : (_parsedXML$ogcServic = parsedXML['ogc:ServiceExceptionReport']) === null || _parsedXML$ogcServic === void 0 ? void 0 : _parsedXML$ogcServic['ogc:ServiceException']);
  const message = typeof serviceExceptionXML === 'string' ? serviceExceptionXML : serviceExceptionXML.value || serviceExceptionXML.code || 'Unknown error';
  return message;
}
//# sourceMappingURL=parse-wms-error.js.map