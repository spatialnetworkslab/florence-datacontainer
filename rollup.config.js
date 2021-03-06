import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import pkg from './package.json'

export default [
  // browser-friendly UMD build
  {
    input: 'src/index.js',
    output: {
      name: 'DataContainer',
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
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins: [
      resolve()
    ]
  },
  // minified built for REPL
  {
    input: 'src/index.js',
    output: [
      {
        file: 'dist/florence-datacontainer.mjs',
        format: 'es'
      }
    ],
    plugins: [
      resolve(),
      commonjs()
    ]
  }
]
