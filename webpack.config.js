const CopyPlugin = require("copy-webpack-plugin")
const HtmlWebpackPlugin = require("html-webpack-plugin")

const fallbacks = {
    "stream": require.resolve("stream-browserify"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "timers": require.resolve("timers-browserify"),
    "url": require.resolve("url/"),
};

module.exports = [
    {
        mode: "production",
        entry: "./src/electron.ts",
        target: "electron-main",
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    include: /src/,
                    resolve: {
                        extensions: [".ts", ".js"],
                    },
                    use: [{ loader: "ts-loader" }],
                },
            ],
        },
        output: {
            devtoolModuleFilenameTemplate: "[absolute-resource-path]",
            path: __dirname + "/dist",
            filename: "electron.js",
        },
        node: {
            __dirname: false,
        },
        resolve: {
            fallback: fallbacks,
        },
    },
    {
        mode: "production",
        entry: "./src/preload.ts",
        target: "electron-preload",
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    include: /src/,
                    resolve: {
                        extensions: [".ts", ".js"],
                    },
                    use: [{ loader: "ts-loader" }],
                },
            ],
        },
        output: {
            path: __dirname + "/dist",
            filename: "preload.js",
        },
        resolve: {
            fallback: fallbacks,
        },
    },
    {
        mode: "production",
        entry: "./src/index.tsx",
        target: "web",
        devtool: "source-map",
        performance: {
            hints: false,
        },
        module: {
            rules: [
                {
                    test: /\.ts(x?)$/,
                    include: /src/,
                    resolve: {
                        extensions: [".ts", ".tsx", ".js"],
                    },
                    use: [{ loader: "ts-loader" }],
                },
            ],
        },
        output: {
            path: __dirname + "/dist",
            filename: "index.js",
        },
        plugins: [
            new HtmlWebpackPlugin({
                template: "./src/index.html",
            }),
            new CopyPlugin({
                patterns: [
                    {
                        from: "resources/",
                        // Do not alter anything from resources/
                        info: { minimized: true },
                    }
                ],
            }),
        ],
        resolve: {
            fallback: fallbacks,
        },
    },
]
