import { CompositeLayer, Layer, LayersList, DefaultProps } from '@deck.gl/core/typed';
import { PolygonLayerProps } from '@deck.gl/layers/typed';
/** All properties supported by GeoCellLayer. */
export declare type GeoCellLayerProps<DataT = any> = PolygonLayerProps<DataT>;
export default class GeoCellLayer<DataT = any, ExtraProps extends {} = {}> extends CompositeLayer<Required<GeoCellLayerProps<DataT>> & ExtraProps> {
    static layerName: string;
    static defaultProps: DefaultProps;
    /** Implement to generate props to create geometry. */
    indexToBounds(): Partial<GeoCellLayer['props']> | null;
    renderLayers(): Layer | null | LayersList;
}
//# sourceMappingURL=GeoCellLayer.d.ts.map