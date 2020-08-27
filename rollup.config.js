import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import pkg from './package.json'

export default [
  // browser-friendly UMD build
  {
    input: 'src/index.js',
    output: {
      name: 'florence-datacontainer',
      file: pkg.browser,
      format: 'umd'
    },
    plugins: [
      resolve(),
      commonjs()
    ]
  },
  {
    input: 'src/index.js',
    external: ['d3-geo'],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins: [
      resolve()
    ]
  }
]
