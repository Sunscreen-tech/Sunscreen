import type { CracoConfig, WebpackContext } from '@craco/types';
import type { Configuration as WebpackConfig } from 'webpack';
import type { CliArgs } from '../../args';
export declare function createWebpackDevConfig(callerCracoConfig: CracoConfig, callerContext?: WebpackContext, options?: CliArgs): WebpackConfig;
export declare function createWebpackProdConfig(callerCracoConfig: CracoConfig, callerContext?: WebpackContext, options?: CliArgs): WebpackConfig;
