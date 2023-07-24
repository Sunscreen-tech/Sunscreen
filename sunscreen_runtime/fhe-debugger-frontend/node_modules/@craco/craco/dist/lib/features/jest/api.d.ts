import type { CracoConfig, JestContext } from '@craco/types';
import type { Config as JestConfig } from '@jest/types';
import type { CliArgs } from '../../args';
export declare function createJestConfig(callerCracoConfig: CracoConfig, callerContext?: JestContext, options?: CliArgs): JestConfig.InitialOptions;
