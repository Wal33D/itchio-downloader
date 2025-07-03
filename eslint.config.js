const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettier = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
  {
    ignores: ['dist/**'],
    languageOptions: {
      ecmaVersion: 12,
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
  },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  prettier,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'prefer-const': 'off',
      'no-inner-declarations': 'off',
      'no-empty': 'off',
      'no-constant-condition': 'off',
    },
  },
  {
    files: ['**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-var-requires': 'off',
    },
  },
];
