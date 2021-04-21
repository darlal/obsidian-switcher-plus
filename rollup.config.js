import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const isProd = process.env.BUILD === 'production';

export default {
  input: 'src/main.ts',
  treeshake: false,
  output: {
    dir: 'dist/darlal-switcher-plus',
    sourcemap: 'inline',
    sourcemapExcludeSources: isProd,
    format: 'cjs',
    exports: 'default',
  },
  external: ['obsidian'],
  plugins: [typescript(), nodeResolve(), commonjs()],
};
