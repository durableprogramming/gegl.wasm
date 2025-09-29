import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

const name = 'GeglWasm';
const input = 'js/gegl-wrapper.js';

export default [
  // ES6 modules
  {
    input,
    output: {
      file: 'dist/gegl-wasm.mjs',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
    ],
    external: ['fs', 'path'], // Node.js modules that shouldn't be bundled
  },

  // CommonJS
  {
    input,
    output: {
      file: 'dist/gegl-wasm.cjs',
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
    ],
    external: ['fs', 'path'],
  },

  // UMD (for browsers with script tags)
  {
    input,
    output: {
      file: 'dist/gegl-wasm.umd.js',
      format: 'umd',
      name,
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
    ],
  },

  // UMD minified
  {
    input,
    output: {
      file: 'dist/gegl-wasm.umd.min.js',
      format: 'umd',
      name,
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      terser(),
    ],
  },

  // IIFE (standalone browser build)
  {
    input,
    output: {
      file: 'dist/gegl-wasm.iife.js',
      format: 'iife',
      name,
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
    ],
  },

  // IIFE minified
  {
    input,
    output: {
      file: 'dist/gegl-wasm.iife.min.js',
      format: 'iife',
      name,
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      terser(),
    ],
  },
];