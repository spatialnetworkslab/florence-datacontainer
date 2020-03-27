import DataContainer from '../../src/index.js'

describe('arrange transformation', () => {
  test('works with dates (descending)', () => {
    const dataContainer = new DataContainer({
      date: new Array(5).fill(0).map((_, i) => new Date(2020, i, 1))
    })

    const sorted = dataContainer.arrange({ date: 'descending' })

    const expectedResult = new Array(5).fill(0).map((_, i) => new Date(2020, 4 - i, 1))

    expect(sorted.column('date')).toEqual(expectedResult)
  })

  test('works with dates (ascending)', () => {
    const dataContainer = new DataContainer({
      date: new Array(5).fill(0).map((_, i) => new Date(2020, 4 - i, 1))
    })

    const sorted = dataContainer.arrange({ date: 'ascending' })

    const expectedResult = new Array(5).fill(0).map((_, i) => new Date(2020, i, 1))

    expect(sorted.column('date')).toEqual(expectedResult)
  })
})
