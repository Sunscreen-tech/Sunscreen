import ColumnLayer, { ColumnLayerProps } from './column-layer';
import type { DefaultProps } from '@deck.gl/core/typed';
/** All properties supported by GridCellLayer. */
export declare type GridCellLayerProps<DataT = any> = _GridCellLayerProps & ColumnLayerProps<DataT>;
/** Properties added by GridCellLayer. */
declare type _GridCellLayerProps = {
    /**
     * @default 1000
     */
    cellSize?: number;
};
export default class GridCellLayer<DataT = any, ExtraPropsT extends {} = {}> extends ColumnLayer<DataT, ExtraPropsT & Required<_GridCellLayerProps>> {
    static layerName: string;
    static defaultProps: DefaultProps<GridCellLayerProps<any>>;
    getGeometry(diskResolution: any): any;
    draw({ uniforms }: {
        uniforms: any;
    }): void;
}
export {};
//# sourceMappingURL=grid-cell-layer.d.ts.map