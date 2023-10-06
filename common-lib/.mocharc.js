'use strict';
require('dotenv').config();
process.env.TS_NODE_COMPILER_OPTIONS = '{"module":"commonjs"}';
process.env.TS_NODE_FILES = 'true';
module.exports = {
  'allow-uncaught': true,
  diff: true,
  extension: ['ts'],
  recursive: true,
  reporter: 'spec',
  require: ['ts-node/register'],
  slow: 300,
  spec: 'test/**/*.test.ts',
  timeout: 20000,
  ui: 'bdd',
  watch: false,
  'watch-files': ['test/**/*.ts'],
};
