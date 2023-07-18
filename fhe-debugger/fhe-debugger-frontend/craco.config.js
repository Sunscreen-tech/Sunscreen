const path = require('path');
const enableImportsFromExternalPaths = require("./src/helpers/craco/enableImportsFromExternalPaths");


module.exports = {
    plugins: [
        {
            plugin: {
                overrideWebpackConfig: ({ webpackConfig }) => {
                    enableImportsFromExternalPaths(webpackConfig, [
                        // Add the paths here
                        path.resolve("./node_modules/react")
                    ]);
                    return webpackConfig;
                },
            },
        },
    ],
    webpack: {
        configure:  {
            module: {
                rules: [
                     {
                        test: /\.m?js$/,
                        resolve: {
                            fullySpecified: false,
                        },
                    },
                ],
            },
            resolve: {
                alias: {
                    react: path.resolve("./node_modules/react"),
                },
            },
        },
    },
};