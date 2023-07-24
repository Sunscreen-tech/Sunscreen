import type { CracoConfig, DevServerContext } from '@craco/types';
import type { CliArgs } from '../../args';
export declare function createDevServerConfigProviderProxy(callerCracoConfig: CracoConfig, callerContext: DevServerContext, options: CliArgs): (proxy: any, allowedHost: string) => import("webpack-dev-server").Configuration;
