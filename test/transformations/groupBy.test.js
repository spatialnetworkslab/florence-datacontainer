import DataContainer from '../../src/index.js'

describe('groupBy transformation', () => {
  test('groupBy generates new keys', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'a', 'b', 'c']
    })

    const grouped = dataContainer.groupBy('b')

    expect(grouped.column('$key')).toEqual([0, 1, 2])
  })

  test('groupBy followed by summarise generates new keys', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'a', 'b', 'c']
    })

    const summarised = dataContainer.groupBy('b').summarise({ sumA: { a: 'sum' } })

    expect(summarised.column('$key')).toEqual([0, 1, 2])
  })
})
