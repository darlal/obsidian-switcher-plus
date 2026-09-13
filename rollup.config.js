import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

// Production is the default because the Obsidian community build verifier runs a bare
// `npm run build` which needs to produce the same bytes we publish in the release artifact.
const isProd = process.env.BUILD !== 'development';
const tsconfig = isProd ? './tsconfig.prod.json' : './tsconfig.json'

export default {
  input: 'src/main.ts',
  treeshake: false,
  output: {
    dir: 'dist',
    sourcemap: isProd ? false : 'inline',
    sourcemapExcludeSources: isProd,
    format: 'cjs',
    exports: 'default',
  },
  external: ['obsidian', 'electron'],
  plugins: [
    typescript({ tsconfig }),
    nodeResolve(),
    commonjs(),
    isProd && terser({
          format: {
            comments: false
          },
          sourceMap: false,
          compress: true
        })
  ],
};
