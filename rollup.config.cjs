const typescript = require('@rollup/plugin-typescript');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const  terser = require('@rollup/plugin-terser');

const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'esm',
    sourcemap: !isProd,
  },
  plugins: [
    nodeResolve({
      browser: true,
      exportConditions: ['browser', 'module', 'default'],
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: !isProd,
    }),
    isProd && terser({
      format: {
        comments: false,
      },
      compress: {
        drop_console: true,
      },
    }),
    ],
};