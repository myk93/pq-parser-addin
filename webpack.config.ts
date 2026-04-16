import path from "path";
import webpack from "webpack";
import HtmlWebpackPlugin from "html-webpack-plugin";
import type { Configuration as DevServerConfiguration } from "webpack-dev-server";
import fs from "fs";

const devCertsDir = path.join(require("os").homedir(), ".office-addin-dev-certs");

const devServer: DevServerConfiguration = {
    port: 3100,
    server: fs.existsSync(path.join(devCertsDir, "localhost.key"))
        ? {
              type: "https",
              options: {
                  key: fs.readFileSync(path.join(devCertsDir, "localhost.key")),
                  cert: fs.readFileSync(path.join(devCertsDir, "localhost.crt")),
                  ca: fs.readFileSync(path.join(devCertsDir, "ca.crt")),
              },
          }
        : { type: "https" },
    headers: { "Access-Control-Allow-Origin": "*" },
};

const config: webpack.Configuration = {
    entry: { taskpane: "./src/taskpane/index.tsx" },
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "[name].bundle.js",
        publicPath: "./",
        clean: true,
    },
    resolve: {
        extensions: [".ts", ".tsx", ".js"],
        fallback: { buffer: require.resolve("buffer/") },
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/taskpane/index.html",
            filename: "taskpane.html",
            chunks: ["taskpane"],
        }),
        new webpack.ProvidePlugin({
            Buffer: ["buffer", "Buffer"],
        }),
    ],
    externals: { "office-js": "Office" },
    devServer,
    devtool: "source-map",
};

export default config;
