import DataContainer from '../../src/index.js'

describe('groupBy transformation', () => {
  test('groupBy generates new keys', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'a', 'b', 'c']
    })

    const grouped = dataContainer.groupBy('b')

    expect(grouped.keys()).toEqual([0, 1, 2])
  })

  test('groupBy followed by summarise generates new keys', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'a', 'b', 'c']
    })

    const summarised = dataContainer.groupBy('b').summarise({ sumA: { a: 'sum' } })

    expect(summarised.keys()).toEqual([0, 1, 2])
  })

  test('groupBy results in a new column of DataContainers', () => {
    const dataContainer = new DataContainer(
      { fruit: ['apple', 'banana', 'banana', 'apple'], amount: [10, 5, 13, 9] }
    )

    const grouped = dataContainer.groupBy('fruit')

    expect(grouped.column('fruit')).toEqual(['apple', 'banana'])
    expect(grouped.map('$grouped', group => group.column('amount'))).toEqual([[10, 9], [5, 13]])
  })
})
