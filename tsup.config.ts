import { defineConfig } from 'tsup';

export default defineConfig({
  clean: true,
  entry: {
    index: 'src/index.ts',
    brandscale: 'src/providers/brandscale',
    cohere: 'src/providers/cohere',
    helpers: 'src/helpers.ts',
    json: 'src/json',
    openai: 'src/providers/openai',
    schema: 'src/Schema.ts',
    providers: 'src/providers'
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
