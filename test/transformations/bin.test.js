import DataContainer from '../../src/index.js'

describe('bin transformation', () => {
  test('EqualInterval works', () => {
    const dataContainer = new DataContainer(
      { a: [1, 2, 3, 4, 5, 6, 7], b: [8, 9, 10, 11, 12, 13, 14] }
    )

    const binned = dataContainer.bin({ column: 'a', method: 'EqualInterval', numClasses: 3 })

    expect(binned.column('bins')).toEqual([[1, 3], [3, 5], [5, 7]])
    expect(binned.type('bins')).toBe('interval')
    expect(binned.row({ index: 1 }).$grouped.rows()).toEqual([{ a: 3, b: 10, $key: '2' }, { a: 4, b: 11, $key: '3' }])
  })

  test('IntervalSize works', () => {
    const dataContainer = new DataContainer(
      { a: [1, 2, 3, 4, 5, 6, 7], b: [8, 9, 10, 11, 12, 13, 14] }
    )

    const binned = dataContainer.bin({ column: 'a', method: 'IntervalSize', binSize: 2 })

    expect(binned.column('bins')).toEqual([[1, 3], [3, 5], [5, 7]])
  })

  test('empty bins are removed', () => {
    const dataContainer = new DataContainer(
      { a: [1, 2, 5, 6, 7], b: [8, 9, 12, 13, 14] }
    )

    const binned = dataContainer.bin({ column: 'a', method: 'IntervalSize', binSize: 2 })

    expect(binned.column('bins')).toEqual([[1, 3], [5, 7]])
  })

  test('[1, 2, 3, 4, 5], IntervalSize with binSize 2 results in bins [1, 3] and [3, 5]', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5]
    })

    const binned = dataContainer.bin({ column: 'a', method: 'IntervalSize', binSize: 2 })

    expect(binned.column('bins')).toEqual([[1, 3], [3, 5]])
  })

  test('multi-dimensional binning 1', () => {
    const dataContainer = new DataContainer({
      a: new Array(20).fill(0).map((_, i) => i),
      b: new Array(20).fill(0).map((_, i) => i),
      c: new Array(20).fill(0).map(_ => Math.random() < 0.5 ? 'a' : 'b')
    })

    const binned = dataContainer.bin([
      { column: 'a', method: 'IntervalSize', binSize: 5 },
      { column: 'b', method: 'IntervalSize', binSize: 5 }
    ])

    expect(binned.column('bins_a')).toEqual([[0, 5], [5, 10], [10, 19]])
    expect(binned.column('bins_b')).toEqual([[0, 5], [5, 10], [10, 19]])
    expect(binned.summarise({ mean_a: { a: 'mean' } }).column('mean_a')).toEqual([2, 7, 14.5])
  })

  test('multi-dimension binning 2', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 5, 1, 2, 3, 5, 1, 2, 3, 5, 1, 2, 3, 5],
      b: [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 5, 5, 5, 5],
      c: new Array(16).fill(0).map(_ => Math.random() < 0.5 ? 'a' : 'b')
    })

    const binned = dataContainer.bin([
      { column: 'a', method: 'IntervalSize', binSize: 2 },
      { column: 'b', method: 'IntervalSize', binSize: 2 }
    ])

    expect(binned.column('bins_a')).toEqual([[1, 3], [1, 3], [3, 5], [3, 5]])
    expect(binned.column('bins_b')).toEqual([[1, 3], [3, 5], [1, 3], [3, 5]])
  })
})
