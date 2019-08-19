import DataContainer from '../../src/index.js'

describe('cumsum transformation', () => {
  test('cumsum creates new column with cumulative sum', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4]
    }).cumsum({ cumsum_a: 'a' })

    expect(dataContainer.column('cumsum_a')).toEqual([1, 3, 6, 10])
  })

  // test('cumsum ignores invalid values', () => {

  // })

  // test('cumsum throw error for non-quantitative columns', () => {

  // })
})
