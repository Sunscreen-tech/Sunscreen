import type { CracoConfig, DevServerContext } from '@craco/types';
import type { Configuration as DevServerConfig } from 'webpack-dev-server';
export declare function createConfigProviderProxy(cracoConfig: CracoConfig, context: DevServerContext): (proxy: any, allowedHost: string) => DevServerConfig;
