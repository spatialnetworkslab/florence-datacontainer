import proj4 from 'proj4'
import { transformGeometries } from '../../helpers/geometryUtils'
import { warn } from '../../helpers/logging.js'

export default function (data, reprojectInstructions) {
  if (!('$geometry' in data)) {
    warn('No geometry column found. Skipping reproject-transformation.')
    return data
  }

  if (!('to' in reprojectInstructions)) {
    warn(`reproject: missing required option 'to'`)
    return data
  }

  let from = 'WGS84'
  if ('from' in reprojectInstructions) {
    from = reprojectInstructions.from
  }

  const transformation = proj4(from, reprojectInstructions.to).forward

  const transformedGeometries = transformGeometries(data.$geometry, transformation)
  data.$geometry = transformedGeometries

  return data
}
