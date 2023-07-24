import type { CracoConfig, CraPaths, DevServerConfigProvider, JestConfigProvider } from '@craco/types';
import type { Configuration as WebpackConfig } from 'webpack';
export declare function getReactScriptVersion(cracoConfig: CracoConfig): {
    version: any;
    isSupported: boolean;
};
export declare function getCraPathsPath(cracoConfig: CracoConfig): string;
export declare function getCraPaths(cracoConfig: CracoConfig): any;
export declare function overrideCraPaths(cracoConfig: CracoConfig, newConfig?: CraPaths): void;
export declare function loadWebpackDevConfig(cracoConfig: CracoConfig): WebpackConfig;
export declare function overrideWebpackDevConfig(cracoConfig: CracoConfig, newConfig: WebpackConfig): void;
export declare function loadWebpackProdConfig(cracoConfig: CracoConfig): WebpackConfig;
export declare function overrideWebpackProdConfig(cracoConfig: CracoConfig, newConfig: WebpackConfig): void;
export declare function loadDevServerConfigProvider(cracoConfig: CracoConfig): DevServerConfigProvider;
export declare function overrideDevServerConfigProvider(cracoConfig: CracoConfig, configProvider: any): void;
export declare function loadDevServerUtils(): any;
export declare function overrideDevServerUtils(newUtils: any): void;
export declare function loadJestConfigProvider(cracoConfig: CracoConfig): JestConfigProvider;
export declare function overrideJestConfigProvider(cracoConfig: CracoConfig, configProvider: any): void;
/************  Scripts  *******************/
export declare function start(cracoConfig: CracoConfig): void;
export declare function build(cracoConfig: CracoConfig): void;
export declare function test(cracoConfig: CracoConfig): void;
