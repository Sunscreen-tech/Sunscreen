"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Native
const child_process_1 = require("child_process");
const path_1 = require("path");
// Utilities
const utilities_1 = require("../utilities");
/**
 * Spawn a child process of a texture compression tool (e.g. PVRTexTool, Crunch)
 *
 * @param args Command line arguments
 * @param flagMapping Flags to pass to the texture compression tool
 * @param binaryName Name of the texture compression tool
 */
exports.spawnProcess = (args, flagMapping, binaryName) => {
    const toolPath = path_1.join(utilities_1.getBinaryDirectory(), binaryName);
    const toolFlags = args.flags ? utilities_1.splitFlagAndValue(utilities_1.createFlagsForTool(args.flags)) : [];
    const combinedFlags = [...flagMapping, ...toolFlags];
    return new Promise((resolve, reject) => {
        if (args.verbose) {
            console.log(`Using flags: ${combinedFlags}`);
        }
        const child = child_process_1.spawn(toolPath, combinedFlags, {
            // @ts-ignore
            env: {
                PATH: utilities_1.getBinaryDirectory() || process.env,
            },
        });
        if (args.verbose) {
            child.stdout.on('data', (data) => console.log(`${data}`));
            child.stderr.on('data', (data) => {
                console.log(`${data}`);
            });
        }
        child.once('exit', (code) => {
            if (code !== 0) {
                reject(new Error(`Compression tool exited with error code ${code}`));
            }
            else {
                resolve();
            }
        });
    });
};
//# sourceMappingURL=spawnProcess.js.map