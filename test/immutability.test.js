import DataContainer from '../src/index.js'

describe('immutability', () => {
  test('changed transformed DataContainer leaves old one intact (updateRow)', () => {
    const original = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'b', 'a', 'b']
    })

    const filtered = original.filter(row => row.a < 3)
    filtered.updateRow(0, { a: 5, b: 'e' })

    expect(original.row(0)).toEqual({ a: 1, b: 'a', $key: 0 })
  })

  test('changed transformed DataContainer leaves old one intact (deleteRow)', () => {
    const original = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'b', 'a', 'b']
    })

    const filtered = original.filter(row => row.a < 4)
    filtered.deleteRow(0)

    expect(original.row(0)).toEqual({ a: 1, b: 'a', $key: 0 })
  })

  test('unmutated transformed DataContainer columns are same as old ones', () => {
    const original = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'b', 'a', 'b']
    })

    const extraCol = original.mutate({ c: row => row.a + 1 })

    expect(original.column('a')).toBe(extraCol.column('a'))
  })
})
