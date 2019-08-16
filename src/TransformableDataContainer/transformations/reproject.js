import proj4 from '@spatialnetworkslab/proj4js'
import { transformGeometries } from '../../utils/transform.js'
import { warn } from '../../utils/logging.js'

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
