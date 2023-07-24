"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setEnvironmentVariables = void 0;
var utils_1 = require("../../utils");
function setEnvironmentVariable(envProperty, value) {
    if (!(0, utils_1.isString)(value)) {
        process.env[envProperty] = value.toString();
    }
    else {
        process.env[envProperty] = value;
    }
}
function setEnvironmentVariables(devServerConfig) {
    var open = devServerConfig.open, https = devServerConfig.https, host = devServerConfig.host, port = devServerConfig.port;
    if (open === false) {
        setEnvironmentVariable('BROWSER', 'none');
    }
    if (https) {
        setEnvironmentVariable('HTTPS', 'true');
    }
    if (host) {
        setEnvironmentVariable('HOST', host);
    }
    if (port) {
        setEnvironmentVariable('PORT', port);
    }
}
exports.setEnvironmentVariables = setEnvironmentVariables;
