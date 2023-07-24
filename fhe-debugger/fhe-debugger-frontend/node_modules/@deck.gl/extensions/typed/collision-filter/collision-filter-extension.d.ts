import { Accessor, Layer, LayerContext, LayerExtension } from '@deck.gl/core/typed';
export declare type CollisionFilterExtensionProps<DataT = any> = {
    /**
     * Accessor for collision priority. Must return a number in the range -1000 -> 1000. Features with higher values are shown preferentially.
     */
    getCollisionPriority?: Accessor<DataT, number>;
    /**
     * Enable/disable collisions. If collisions are disabled, all objects are rendered.
     * @default true
     */
    collisionEnabled: boolean;
    /**
     * Collision group this layer belongs to. If it is not set, the 'default' collision group is used
     */
    collisionGroup?: string;
    /**
     * Props to override when rendering collision map
     */
    collisionTestProps?: {};
};
/** Allows layers to hide overlapping objects. */
export default class CollisionFilterExtension extends LayerExtension {
    static defaultProps: {
        getCollisionPriority: {
            type: string;
            value: number;
        };
        collisionEnabled: boolean;
        collisionGroup: {
            type: string;
            value: string;
        };
        collisionTestProps: {};
    };
    static extensionName: string;
    getShaders(this: Layer<CollisionFilterExtensionProps>): any;
    draw(this: Layer<CollisionFilterExtensionProps>, { uniforms, context, moduleParameters }: any): void;
    initializeState(this: Layer<CollisionFilterExtensionProps>, context: LayerContext, extension: this): void;
    getNeedsPickingBuffer(this: Layer<CollisionFilterExtensionProps>): boolean;
}
//# sourceMappingURL=collision-filter-extension.d.ts.map