import coordEach from './coordEach.js'

export function calculateBBoxGeometries (geometries) {
  let bbox = { x: [Infinity, -Infinity], y: [Infinity, -Infinity] }

  for (let i = 0; i < geometries.length; i++) {
    bbox = updateBBox(bbox, geometries[i])
  }

  return bbox
}

export function updateBBox ({ x, y }, geometry) {
  coordEach(geometry, coord => {
    x[0] = Math.min(coord[0], x[0])
    x[1] = Math.max(coord[0], x[1])
    y[0] = Math.min(coord[1], y[0])
    y[1] = Math.max(coord[1], y[1])
  })

  return { x, y }
}
