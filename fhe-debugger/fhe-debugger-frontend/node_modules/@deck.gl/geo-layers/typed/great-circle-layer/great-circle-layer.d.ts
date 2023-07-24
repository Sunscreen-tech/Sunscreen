import { DefaultProps } from '@deck.gl/core/typed';
import { ArcLayer, ArcLayerProps } from '@deck.gl/layers/typed';
/** All properties supported by GreatCircleLayer. */
export declare type GreatCircleLayerProps<DataT = any> = ArcLayerProps<DataT>;
/** @deprecated Use ArcLayer with `greatCircle: true` instead */
export default class GreatCircleLayer<DataT = any, ExtraProps extends {} = {}> extends ArcLayer<DataT, ExtraProps> {
    static layerName: string;
    static defaultProps: DefaultProps<ArcLayerProps<any>>;
}
//# sourceMappingURL=great-circle-layer.d.ts.map