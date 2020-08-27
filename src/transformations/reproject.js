import { transformGeometries } from '../utils/transform.js'
import { warn } from '../utils/logging.js'

export default function (data, transformation) {
  if (!('$geometry' in data)) {
    warn('No geometry column found. Skipping reproject-transformation.')
    return data
  }

  const transformedGeometries = transformGeometries(data.$geometry, transformation)

  const newData = Object.assign({}, data)
  newData.$geometry = transformedGeometries

  return newData
}
