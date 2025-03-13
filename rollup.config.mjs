import typescript from '@rollup/plugin-typescript';
import wasm from '@rollup/plugin-wasm';
import url from '@rollup/plugin-url';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'es',
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist/types',
    }),
    wasm({
      maxFileSize: 0,
    }),
    url({
      include: '**/*.wasm',
      limit: 0,
    }),
  ],
};
