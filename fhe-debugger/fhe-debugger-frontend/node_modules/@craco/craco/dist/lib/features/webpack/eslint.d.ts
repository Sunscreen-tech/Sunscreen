import type { BaseContext, CracoConfig } from '@craco/types';
import type { Configuration as WebpackConfig } from 'webpack';
export declare function overrideEsLint(cracoConfig: CracoConfig, webpackConfig: WebpackConfig, context: BaseContext): WebpackConfig;
