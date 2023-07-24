"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailablePort = void 0;
const child_process_1 = __importDefault(require("child_process"));
// Get an available port
// Works on Unix systems
function getAvailablePort(defaultPort = 3000) {
    return new Promise((resolve) => {
        // Get a list of all ports in use
        child_process_1.default.exec('lsof -i -P -n | grep LISTEN', (error, stdout) => {
            if (error) {
                // likely no permission, e.g. CI
                resolve(defaultPort);
                return;
            }
            const portsInUse = [];
            const regex = /:(\d+) \(LISTEN\)/;
            stdout.split('\n').forEach((line) => {
                const match = regex.exec(line);
                if (match) {
                    portsInUse.push(Number(match[1]));
                }
            });
            let port = defaultPort;
            while (portsInUse.includes(port)) {
                port++;
            }
            resolve(port);
        });
    });
}
exports.getAvailablePort = getAvailablePort;
