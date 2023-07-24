import { WMSCapabilitiesLoader } from '../wms-capabilities-loader';
import { parseWMSLayerDescription } from '../lib/parsers/wms/parse-wms-layer-description';
export const WMSLayerDescriptionLoader = {
  ...WMSCapabilitiesLoader,
  id: 'wms-layer-description',
  name: 'WMS DescribeLayer',
  parse: async (arrayBuffer, options) => parseWMSLayerDescription(new TextDecoder().decode(arrayBuffer), options),
  parseTextSync: (text, options) => parseWMSLayerDescription(text, options)
};
export const _typecheckWMSFeatureInfoLoader = WMSLayerDescriptionLoader;
//# sourceMappingURL=wms-layer-description-loader.js.map