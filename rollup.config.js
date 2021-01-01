import typescript from '@rollup/plugin-typescript'
import commonjs from '@rollup/plugin-commonjs';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/main.ts',
  treeshake: false,
  output: {
    dir: 'dist/darlal-switcher-plus',
    sourcemap: false,
    format: 'cjs',
    exports: 'default',
  },
  external: ['obsidian'],
  plugins: [
    // typescript(),
    // typescript({ sourceMap: true }),
    typescript({ sourceMap: true, inlineSources: true }),
    // typescript({ inlineSourceMap: true, inlineSources: true }),
    // typescript({ sourceMap: true, inlineSourceMap: true, inlineSources: true }),
    nodeResolve(),
    commonjs(),
  ],
};
