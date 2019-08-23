import coordEach from './coordEach.js'

export function transformGeometries (geometries, transformFunc) {
  const geometriesClone = JSON.parse(JSON.stringify(geometries))

  if (geometriesClone.constructor === Array) {
    for (let i = 0; i < geometriesClone.length; i++) {
      transformGeometryInplace(geometriesClone[i], transformFunc)
    }
  }

  if (geometriesClone.constructor === Object) {
    for (const key in geometriesClone) {
      transformGeometryInplace(geometriesClone[key], transformFunc)
    }
  }

  return geometriesClone
}

export function transformGeometry (geometry, transformFunc) {
  const geometryClone = JSON.parse(JSON.stringify(geometry))
  transformGeometryInplace(geometryClone, transformFunc)

  return geometryClone
}

function transformGeometryInplace (geometry, transformFunc) {
  coordEach(geometry, coord => {
    const transformedPosition = transformFunc(coord)
    coord[0] = transformedPosition[0]
    coord[1] = transformedPosition[1]
  })
}
