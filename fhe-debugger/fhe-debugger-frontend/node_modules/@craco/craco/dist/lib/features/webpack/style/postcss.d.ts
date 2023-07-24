import type { BaseContext, CracoStyleConfig } from '@craco/types';
import type { Configuration as WebpackConfig } from 'webpack';
export declare function overridePostcss(styleConfig: CracoStyleConfig, webpackConfig: WebpackConfig, context: BaseContext): WebpackConfig;
