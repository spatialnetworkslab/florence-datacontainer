import coordEach from './coordEach.js'

export function calculateBBoxGeometries (geometries) {
  const bbox = {
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity
  }

  for (let i = 0; i < geometries.length; i++) {
    updateBBox(bbox, geometries[i])
  }

  return bbox
}

export function updateBBox (bbox, geometry) {
  coordEach(geometry, coord => {
    bbox.minX = Math.min(coord[0], bbox.minX)
    bbox.maxX = Math.max(coord[0], bbox.maxX)
    bbox.minY = Math.min(coord[1], bbox.minY)
    bbox.maxY = Math.max(coord[1], bbox.maxY)
  })
}
