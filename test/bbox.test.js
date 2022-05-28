import DataContainer from '../src/index.js'

const geometry1 = {
  type: 'Polygon',
  coordinates: [[
    [-1, 1],
    [-2, 3],
    [4, 4],
    [2, -1],
    [-1, 1]
  ]]
}

const geometry2 = {
  type: 'Polygon',
  coordinates: [[
    [-3, -1],
    [-4, 1],
    [2, 2],
    [0, -3],
    [-3, 1]
  ]]
}

describe('bbox', () => {
  test('works with one geometry', () => {
    const dataContainer = new DataContainer({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: geometry1
        }
      ]
    })

    const expectedBbox = {
      minX: -2,
      maxX: 4,
      minY: -1,
      maxY: 4
    }

    expect(dataContainer.bbox()).toEqual(expectedBbox)
  })

  test('works with two geometries', () => {
    const dataContainer = new DataContainer({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: geometry1
        },
        {
          type: 'Feature',
          geometry: geometry2
        }
      ]
    })

    const expectedBbox = {
      minX: -4,
      maxX: 4,
      minY: -3,
      maxY: 4
    }

    expect(dataContainer.bbox()).toEqual(expectedBbox)
  })
})
