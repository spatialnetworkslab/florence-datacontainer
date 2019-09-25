import DataContainer from '../../src/index.js'

describe('cumsum transformation', () => {
  test('cumsum creates new column with cumulative sum', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4]
    }).cumsum({ cumsum_a: 'a' })

    expect(dataContainer.column('cumsum_a')).toEqual([1, 3, 6, 10])
  })

  test('cumsum ignores invalid values', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, NaN, 4]
    }).cumsum({ cumsum_a: 'a' })

    expect(dataContainer.column('cumsum_a')).toEqual([1, 3, 3, 7])
  })

  test('cumsum works with asInterval', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4]
    }).cumsum({ cumsum_a: 'a' }, { asInterval: true })

    expect(dataContainer.column('cumsum_a')).toEqual([
      [0, 1],
      [1, 3],
      [3, 6],
      [6, 10]
    ])
  })

  test('cumsum throw error for non-quantitative columns', () => {
    const dataContainer = new DataContainer({
      a: ['a', 'a', 'b', 'b']
    })

    expect(() => dataContainer.cumsum('a')).toThrow()
  })
})
