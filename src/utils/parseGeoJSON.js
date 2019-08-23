import { checkFormatColumnData } from './checkFormat.js'

export default function (geojsonData) {
  const geometryData = []
  const data = {}

  const features = geojsonData.features
  const firstFeature = features[0]

  if ('properties' in firstFeature) {
    for (const columnName in firstFeature.properties) {
      data[columnName] = []
    }
  }

  for (let i = 0; i < features.length; i++) {
    const { geometry, properties } = features[i]
    geometryData.push(geometry)

    for (const columnName in properties) {
      data[columnName].push(properties[columnName])
    }
  }

  checkFormatColumnData(data)

  data.$geometry = geometryData

  return data
}
