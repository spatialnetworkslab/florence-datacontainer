import DataContainer from '../../src/index.js'

function projectionFunction (coords) {
  const x = coords[0] + 5
  const y = coords[1] + 10
  return [x, y]
}

describe('reproject transformation', () => {
  test('reproject works as expected', () => {
    const geojson = new DataContainer({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point', coordinates: [0, 0]
          },
          properties: {
            fruit: 'apple', amount: 1
          }
        }
      ]
    }).reproject(projectionFunction)
    expect(dataContainer.column('$geometry')).toBe([{ type: 'Point', coordinates: [5, 10] }])
  })

  test('reproject throws error if geometry columns does not exist', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'b', 'a', 'b']
    })

    expect(() => dataContainer.reproject(projectionFunction).toThrow())
  })
})
