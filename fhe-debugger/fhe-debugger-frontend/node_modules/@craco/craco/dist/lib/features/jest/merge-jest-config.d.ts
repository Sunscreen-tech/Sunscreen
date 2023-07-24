import type { CracoConfig, JestConfigProvider, JestContext } from '@craco/types';
import type { Config as JestConfig } from '@jest/types';
export declare function mergeJestConfig(cracoConfig: CracoConfig, craJestConfigProvider: JestConfigProvider, context: JestContext): JestConfig.InitialOptions;
