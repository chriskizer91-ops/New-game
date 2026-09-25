export default [
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly', performance: 'readonly',
        requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly', setTimeout: 'readonly',
        clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', localStorage: 'readonly',
        ImageData: 'readonly', matchMedia: 'readonly', innerHeight: 'readonly', innerWidth: 'readonly',
        addEventListener: 'readonly', removeEventListener: 'readonly', scrollBy: 'readonly', getComputedStyle: 'readonly',
        AudioContext: 'readonly', console: 'readonly', process: 'readonly', URL: 'readonly', Blob: 'readonly',
        structuredClone: 'readonly', globalThis: 'readonly', HTMLCanvasElement: 'readonly', KeyboardEvent: 'readonly',
      },
    },
    rules: { 'no-undef': 'error', 'no-unused-vars': ['warn', { args: 'none' }] },
  },
  { ignores: ['node_modules/**', 'dist/**'] },
];
