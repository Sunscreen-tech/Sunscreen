"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.overrideDevServer = void 0;
var cra_1 = require("../../cra");
var utils_1 = require("../../utils");
var create_config_provider_proxy_1 = require("./create-config-provider-proxy");
var override_utils_1 = require("./override-utils");
var set_environment_variables_1 = require("./set-environment-variables");
function overrideDevServer(cracoConfig, context) {
    (0, override_utils_1.overrideDevServerUtils)(cracoConfig);
    if (cracoConfig.devServer && !(0, utils_1.isFunction)(cracoConfig.devServer)) {
        (0, set_environment_variables_1.setEnvironmentVariables)(cracoConfig.devServer);
    }
    var proxy = (0, create_config_provider_proxy_1.createConfigProviderProxy)(cracoConfig, context);
    (0, cra_1.overrideDevServerConfigProvider)(cracoConfig, proxy);
}
exports.overrideDevServer = overrideDevServer;
