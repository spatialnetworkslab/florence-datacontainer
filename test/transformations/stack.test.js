import DataContainer from '../../src/index.js'

describe('stack transformation', () => {
  test('stack works', () => {
    const data = new DataContainer({
      a: [1, 2, 3, 4],
      b: [1, 2, 3, 4],
      c: [1, 2, 3, 4]
    }).stack(['a', 'b', 'c'])

    const expectedA = [[0, 1], [0, 2], [0, 3], [0, 4]]
    const expectedB = [[1, 2], [2, 4], [3, 6], [4, 8]]
    const expectedC = [[2, 3], [4, 6], [6, 9], [8, 12]]

    expect(data.column('stacked_a')).toEqual(expectedA)
    expect(data.column('stacked_b')).toEqual(expectedB)
    expect(data.column('stacked_c')).toEqual(expectedC)
  })
})
