const base = require('./index');
const globals = require('globals');

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...base,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
  },
];

module.exports = config;
