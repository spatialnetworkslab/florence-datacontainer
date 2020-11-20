import DataContainer from '../../src/index.js'

describe('automatic key generation', () => {
  test('works as expected with filter', () => {
    const dataContainer = new DataContainer({ a: [2, 4, 6, 8, 10, 12, 14] })
    const transformed = dataContainer.filter(row => row.a > 10)

    expect(dataContainer.column('$key')).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(transformed.column('$key')).toEqual([5, 6])
    expect(dataContainer.row({ key: 5 })).toEqual({ a: 12, $key: 5 })
  })

  test('works as expected with arrange', () => {
    const dataContainer = new DataContainer({ a: [2, 4, 6, 8, 10, 12, 14] })
    const transformed = dataContainer.arrange({ a: 'descending' })

    expect(dataContainer.column('$key')).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(transformed.column('$key')).toEqual([6, 5, 4, 3, 2, 1, 0])
    expect(dataContainer.row({ key: 5 })).toEqual({ a: 12, $key: 5 })
  })
})
