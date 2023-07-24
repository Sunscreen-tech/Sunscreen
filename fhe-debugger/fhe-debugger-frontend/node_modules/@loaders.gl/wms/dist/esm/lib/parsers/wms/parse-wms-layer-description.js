import { XMLLoader } from '@loaders.gl/xml';
export function parseWMSLayerDescription(text, options) {
  var _XMLLoader$parseTextS;
  const parsedXML = (_XMLLoader$parseTextS = XMLLoader.parseTextSync) === null || _XMLLoader$parseTextS === void 0 ? void 0 : _XMLLoader$parseTextS.call(XMLLoader, text, options);
  return parsedXML;
}
//# sourceMappingURL=parse-wms-layer-description.js.map