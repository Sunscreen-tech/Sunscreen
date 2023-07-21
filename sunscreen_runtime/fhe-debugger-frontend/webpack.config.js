const path = require("path");
const webpack = require("webpack");

module.exports = {
    entry: path.join(path.resolve(__dirname, 'src'), 'App.tsx'),
    output: {
      filename: "[name].js",
      path: path.join(__dirname, "build"),
    },
    mode: 'development',
    module: {
      rules: [
          // `ts` and `tsx` files are parsed using `ts-loader`
        {
          test: /\.(ts|tsx)$/, 
          loader: "ts-loader" 
        }
      ],
    },
    resolve: {
      extensions: ["*", ".js", ".jsx", ".ts", ".tsx"],    
    },
};