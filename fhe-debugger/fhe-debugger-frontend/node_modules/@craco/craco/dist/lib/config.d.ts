import type { BaseContext, CracoConfig } from '@craco/types';
export declare function processCracoConfig(cracoConfig: CracoConfig, context: BaseContext): CracoConfig;
export declare function loadCracoConfig(context: BaseContext): CracoConfig;
export declare function loadCracoConfigAsync(context: BaseContext): Promise<CracoConfig>;
