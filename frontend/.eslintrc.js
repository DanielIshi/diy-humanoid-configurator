export default {
  root: true,
  env: {
    browser: true,
    es2020: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    '@vitejs/eslint-config-react'
  ],
  ignorePatterns: [
    'dist',
    '.eslintrc.js',
    'node_modules',
    'coverage',
    'playwright-report',
    'test-results'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {
    react: {
      version: '18.2'
    }
  },
  plugins: [
    'react-refresh'
  ],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true }
    ],
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'warn',
    'prefer-const': 'error',
    'react/prop-types': 'warn',
    'react/react-in-jsx-scope': 'off'
  }
};