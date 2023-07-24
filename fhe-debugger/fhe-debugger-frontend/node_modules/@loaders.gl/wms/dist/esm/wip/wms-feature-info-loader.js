import { WMSCapabilitiesLoader } from '../wms-capabilities-loader';
import { parseWMSFeatureInfo } from '../lib/parsers/wms/parse-wms-features';
export const WMSFeatureInfoLoader = {
  ...WMSCapabilitiesLoader,
  id: 'wms-feature-info',
  name: 'WMS FeatureInfo',
  parse: async (arrayBuffer, options) => parseWMSFeatureInfo(new TextDecoder().decode(arrayBuffer), options),
  parseTextSync: (text, options) => parseWMSFeatureInfo(text, options)
};
export const _typecheckWMSFeatureInfoLoader = WMSFeatureInfoLoader;
//# sourceMappingURL=wms-feature-info-loader.js.map