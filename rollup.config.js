import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import json from 'rollup-plugin-json'
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
      commonjs(),
      json({
        include: 'node_modules/proj4/**',
        compact: true
      })
    ]
  },
  {
    input: 'src/index.js',
    external: ['@turf/meta', 'd3-array', 'd3-geo', 'd3-interpolate', 'robust-point-in-polygon', 'proj4', 'immer'],
    output: [
      { file: pkg.main, format: 'cjs' },
      { file: pkg.module, format: 'es' }
    ],
    plugins: [
      resolve()
	  ]
  }
]
