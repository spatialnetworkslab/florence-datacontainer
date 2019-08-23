export function valid () {
  const obj = initObj()
  obj.features = dummyFeatures

  return obj
}

export function missingType () {
  const obj = {}
  obj.features = dummyFeatures

  return obj
}

export function missingFeatures () {
  const obj = initObj()
  return obj
}

export function emptyFeatures () {
  const obj = initObj()
  obj.features = []

  return obj
}

export function notSameProperties () {
  const obj = initObj()
  obj.features = [...dummyFeatures, featureWithDifferentProperty]

  return obj
}

export function validGeometries () {
  return dummyFeatures.map(feature => feature.geometry)
}

export function propertiesWith$ () {
  return dummyFeatures.map(feature => ({
    type: feature.type,
    geometry: feature.geometry,
    properties: { $column: 'value' }
  }))
}

export function propertiesWithSlash () {
  return dummyFeatures.map(feature => ({
    type: feature.type,
    geometry: feature.geometry,
    properties: { 'col/umn': 'value' }
  }))
}

function initObj (obj) {
  return {
    type: 'FeatureCollection'
  }
}

const dummyFeatures = [
  {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [102.0, 0.5]
    },
    properties: {
      prop0: 'value0'
    }
  },

  {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [52.0, 30.5]
    },
    properties: {
      prop0: 'value1'
    }
  }
]

const featureWithDifferentProperty = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [32.0, 100.5]
  },
  properties: {
    prop1: 'value2'
  }
}
