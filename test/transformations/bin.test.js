import DataContainer from '../../src/index.js'

describe('bin transformation', () => {
  test('bin works as expected', () => {
    const dataContainer = new DataContainer(
      { a: [1, 2, 3, 4, 5, 6, 7], b: [8, 9, 10, 11, 12, 13, 14] }
    )

    const binned = dataContainer.bin({ groupBy: 'a', method: 'EqualInterval', numClasses: 3 })

    expect(binned.column('bins')).toEqual([[1, 3], [3, 5], [5, 7]])
    expect(binned.type('bins')).toBe('interval')
    expect(binned.row(1).$grouped.rows()).toEqual([{ a: 3, b: 10, $key: 2 }, { a: 4, b: 11, $key: 3 }])
  })
})
