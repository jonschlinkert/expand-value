import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  entry: {
    index: 'index.ts',
    compile: 'src/compile.ts',
    parse: 'src/parse.ts',
    utils: 'src/utils.ts',
    expand: 'src/expand.ts',
    helpers: 'src/helpers.ts'
  },
  cjsInterop: true,
  format: ['cjs', 'esm'],
  keepNames: true,
  minify: false,
  shims: true,
  splitting: false,
  sourcemap: true,
  target: 'node18'
});
