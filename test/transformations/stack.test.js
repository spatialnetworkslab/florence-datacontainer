import DataContainer from '../../src/index.js'

describe('stack transformation', () => {
  test('stack works', () => {
    const data = new DataContainer({
      a: [1, 2, 3, 4],
      b: [1, 2, 3, 4],
      c: [1, 2, 3, 4]
    }).stack(['a', 'b', 'c'])

    const expectedA = [1, 2, 3, 4]
    const expectedB = [2, 4, 6, 8]
    const expectedC = [3, 6, 9, 16]

    expect(data.column('a')).toEqual(expectedA)
    expect(data.column('b')).toEqual(expectedB)
    expect(data.column('c')).toEqual(expectedC)
  })
})
