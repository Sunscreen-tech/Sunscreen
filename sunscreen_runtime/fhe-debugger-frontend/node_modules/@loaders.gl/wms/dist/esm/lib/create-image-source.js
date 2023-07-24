import { ImageService } from './services/generic/image-service';
import { WMSService } from './services/ogc/wms-service';
import { ArcGISImageServer } from './services/arcgis/arcgis-image-service';
const SERVICES = [WMSService, ArcGISImageServer, ImageService];
export function createImageSource(props) {
  const {
    type = 'auto'
  } = props;
  const serviceType = type === 'auto' ? guessServiceType(props.url) : type;
  switch (serviceType) {
    case 'template':
      return new ImageService(props);
    case 'wms':
      return new WMSService(props);
    default:
      throw new Error('Not a valid image source type');
  }
}
function guessServiceType(url) {
  for (const Service of SERVICES) {
    if (Service.testURL && Service.testURL(url)) {
      return Service.type;
    }
  }
  return 'wms';
}
//# sourceMappingURL=create-image-source.js.map