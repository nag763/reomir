// eslint.config.mjs
import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.config({
    extends: [
      'next',
      'next/core-web-vitals',
      'plugin:prettier/recommended', // Make sure this is last
    ],
    plugins: ['prettier'],
    rules: {
      'prettier/prettier': [
        'error',
        {
          // Your Prettier rules here, e.g.:
          'endOfLine': 'auto',
          'semi': true,
          'singleQuote': true,
          'trailingComma': 'all'
        }
      ]
    },
  }),
  // Add any other specific configurations here if needed
];