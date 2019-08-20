import DataContainer from '../src/index.js'

describe('immutability', () => {
  test('new DataContainer returned by filter is not reference to old', () => {
    const original = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'b', 'a', 'b']
    })

    const filtered = original.filter(row => row.a < 3)

    filtered.updateRow(0, { a: 5, b: 'e' })

    expect(original.row(0)).toEqual({ a: 1, b: 'a', $key: 0 })
    expect(filtered.row(0)).toEqual({ a: 5, b: 'e', $key: 0 })
  })
})
