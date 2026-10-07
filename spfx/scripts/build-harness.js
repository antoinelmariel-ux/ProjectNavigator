'use strict';

// Construit le harnais de dev (../harness/dist) avec webpack et les règles partagées avec le
// bundle SPFx. Pas de chaîne Heft ici : le harnais n'a besoin ni de manifeste ni de .sppkg.
const path = require('path');
const webpack = require('webpack');
const { applyAppWebpackRules } = require('../config/app-webpack-rules');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const isWatch = process.argv.includes('--watch');

const config = applyAppWebpackRules({
  mode: 'production',
  devtool: 'source-map',
  entry: path.join(REPO_ROOT, 'harness', 'entry.js'),
  output: {
    path: path.join(REPO_ROOT, 'harness', 'dist'),
    filename: 'main.js',
    chunkFilename: 'chunk.[name].[contenthash].js',
    assetModuleFilename: '[name].[contenthash][ext]',
    publicPath: 'auto',
    clean: true
  },
  performance: { hints: false }
});

const report = (error, stats) => {
  if (error) {
    console.error(error);
    process.exitCode = 1;
    return;
  }
  console.log(stats.toString({ colors: false, modules: false, children: false, chunks: false }));
  if (stats.hasErrors()) {
    process.exitCode = 1;
  }
};

const compiler = webpack(config);
if (isWatch) {
  compiler.watch({}, report);
} else {
  compiler.run((error, stats) => {
    report(error, stats);
    compiler.close(() => {});
  });
}
