'use strict';

const { applyAppWebpackRules } = require('./app-webpack-rules');

module.exports = function customizeWebpackConfig(config) {
  for (const entry of Array.isArray(config) ? config : [config]) {
    applyAppWebpackRules(entry);
  }
};
