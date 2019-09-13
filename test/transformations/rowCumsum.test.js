import DataContainer from '../../src/index.js'

describe('rowCumsum transformation', () => {
  test('rowCumsum works with Array syntax', () => {
    const data = new DataContainer({
      a: [1, 2, 3, 4],
      b: [1, 2, 3, 4],
      c: [1, 2, 3, 4]
    }).rowCumsum(['a', 'b', 'c'])

    const expectedA = [1, 2, 3, 4]
    const expectedB = [2, 4, 6, 8]
    const expectedC = [3, 6, 9, 12]

    expect(data.column('a')).toEqual(expectedA)
    expect(data.column('b')).toEqual(expectedB)
    expect(data.column('c')).toEqual(expectedC)
  })

  test('rowCumsum works with Object syntax', () => {
    const data = new DataContainer({
      a: [1, 2, 3, 4],
      b: [1, 2, 3, 4],
      c: [1, 2, 3, 4]
    }).rowCumsum([{ _a: 'a' }, { _b: 'b' }, 'c'])

    const expectedA = [1, 2, 3, 4]
    const expectedB = [2, 4, 6, 8]
    const expectedC = [3, 6, 9, 12]

    expect(data.column('_a')).toEqual(expectedA)
    expect(data.column('_b')).toEqual(expectedB)
    expect(data.column('c')).toEqual(expectedC)
  })

  test('non-existing columns throw error', () => {
    const data = new DataContainer({
      a: [1, 2, 3, 4]
    })

    expect(() => data.rowCumsum(['a', 'b'])).toThrow()
  })

  test('invalid column types throw error', () => {
    const data = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'b', 'a', 'c']
    })

    expect(() => data.rowCumsum(['a', 'b'])).toThrow()
  })
})
