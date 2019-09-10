import DataContainer from '../../src/index.js'

describe('stack transformation', () => {
  test('stack works with quantitative data', () => {
    const data = new DataContainer({
      a: [1, 2, 3, 4],
      b: [1, 2, 3, 4],
      c: [1, 2, 3, 4]
    }).stack(['a', 'b', 'c'])

    const expectedA = [1, 2, 3, 4]
    const expectedB = [2, 4, 6, 8]
    const expectedC = [3, 6, 9, 12]

    expect(data.column('stacked_a')).toEqual(expectedA)
    expect(data.column('stacked_b')).toEqual(expectedB)
    expect(data.column('stacked_c')).toEqual(expectedC)
  })

  test('non-existing columns throw error', () => {
    const data = new DataContainer({
      a: [1, 2, 3, 4]
    })

    expect(() => data.stack(['a', 'b'])).toThrow()
  })

  test('invalid column types throw error', () => {
    const data = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'b', 'a', 'c']
    })

    expect(() => data.stack(['a', 'b'])).toThrow()
  })
})
