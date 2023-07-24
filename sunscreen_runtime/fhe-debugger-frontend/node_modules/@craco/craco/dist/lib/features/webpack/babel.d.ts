import type { BaseContext, CracoConfig } from '@craco/types';
import type { Configuration as WebpackConfig } from 'webpack';
export declare function overrideBabel(cracoConfig: CracoConfig, webpackConfig: WebpackConfig, context: BaseContext): WebpackConfig;
