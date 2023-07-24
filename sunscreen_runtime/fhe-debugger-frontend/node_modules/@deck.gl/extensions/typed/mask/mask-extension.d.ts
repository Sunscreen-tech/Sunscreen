import { Layer, LayerExtension } from '@deck.gl/core/typed';
export declare type MaskExtensionProps = {
    /**
     * Id of the layer that defines the mask. The mask layer must use the prop `operation: 'mask'`.
     * Masking is disabled if `maskId` is empty or no valid mask layer with the specified id is found.
     */
    maskId?: string;
    /**
     * controls whether an object is clipped by its anchor (usually defined by an accessor called `getPosition`, e.g. icon, scatterplot) or by its geometry (e.g. path, polygon).
     * If not specified, it is automatically deduced from the layer.
     */
    maskByInstance?: boolean;
    /**
     * Inverts the masking operation
     */
    maskInverted?: boolean;
};
/** Allows layers to show/hide objects by a geofence. */
export default class MaskExtension extends LayerExtension {
    static defaultProps: {
        maskId: string;
        maskByInstance: undefined;
        maskInverted: boolean;
    };
    static extensionName: string;
    initializeState(this: Layer<MaskExtensionProps>): void;
    getShaders(this: Layer<MaskExtensionProps>): any;
    draw(this: Layer<Required<MaskExtensionProps>>, { uniforms, context, moduleParameters }: any): void;
}
//# sourceMappingURL=mask-extension.d.ts.map