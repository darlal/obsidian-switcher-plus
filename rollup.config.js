import commonjs from '@rollup/plugin-commonjs';
import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const VOLCANO_PLUGINS = ['switcher-plus'];

const createVolcanoConfig = (filename) => ({
  input: `src/${filename}-volcano.js`,
  treeshake: false,
  output: [
    {
      dir: 'dist/volcano',
      format: 'umd',
      name: filename,
    },
  ],
  plugins: [
    commonjs(),
    nodeResolve(),
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**',
    }),
  ],
});

const volcanoConfigs = VOLCANO_PLUGINS.map((filename) => createVolcanoConfig(filename));

export default [...volcanoConfigs];
