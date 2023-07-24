import { Layer } from '@deck.gl/core/typed';
import { Model } from '@luma.gl/core';
import type { LayerProps, LayerDataSource, Accessor, Unit, Position, Color, UpdateParameters, DefaultProps } from '@deck.gl/core/typed';
declare type _TextBackgroundLayerProps<DataT> = {
    data: LayerDataSource<DataT>;
    billboard?: boolean;
    sizeScale?: number;
    sizeUnits?: Unit;
    sizeMinPixels?: number;
    sizeMaxPixels?: number;
    padding?: [number, number] | [number, number, number, number];
    getPosition?: Accessor<DataT, Position>;
    getSize?: Accessor<DataT, number>;
    getAngle?: Accessor<DataT, number>;
    getPixelOffset?: Accessor<DataT, [number, number]>;
    getBoundingRect?: Accessor<DataT, [number, number, number, number]>;
    getFillColor?: Accessor<DataT, Color>;
    getLineColor?: Accessor<DataT, Color>;
    getLineWidth?: Accessor<DataT, number>;
};
export declare type TextBackgroundLayerProps<DataT = any> = _TextBackgroundLayerProps<DataT> & LayerProps;
export default class TextBackgroundLayer<DataT = any, ExtraPropsT extends {} = {}> extends Layer<ExtraPropsT & Required<_TextBackgroundLayerProps<DataT>>> {
    static defaultProps: DefaultProps<TextBackgroundLayerProps<any>>;
    static layerName: string;
    state: {
        model: Model;
    };
    getShaders(): any;
    initializeState(): void;
    updateState(params: UpdateParameters<this>): void;
    draw({ uniforms }: {
        uniforms: any;
    }): void;
    protected _getModel(gl: WebGLRenderingContext): Model;
}
export {};
//# sourceMappingURL=text-background-layer.d.ts.map