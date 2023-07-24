import { ICLIArgs } from '../argsHandler';
/**
 * Spawn a child process of a texture compression tool (e.g. PVRTexTool, Crunch)
 *
 * @param args Command line arguments
 * @param flagMapping Flags to pass to the texture compression tool
 * @param binaryName Name of the texture compression tool
 */
export declare const spawnProcess: (args: ICLIArgs, flagMapping: string[], binaryName: string) => Promise<any>;
