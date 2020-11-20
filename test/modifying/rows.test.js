import DataContainer from '../../src/index.js'

describe('modifying rows', () => {
  test('addRow works as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'a', 'b', 'b']
    })

    dataContainer.addRow({ a: 5, b: 'c' })

    expect(dataContainer.row(4)).toEqual({ a: 5, b: 'c', $key: 4 })
  })

  test('addRow with missing columns throws error', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'a', 'b', 'b']
    })

    expect(() => dataContainer.addRow({ a: 5 })).toThrow()
  })

  test('addRow with unknown columns throws error', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'a', 'b', 'b']
    })

    expect(() => dataContainer.addRow({ a: 5, b: 'c', c: 1 })).toThrow()
  })

  test('updateRow works as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'a', 'b', 'b']
    })

    dataContainer.updateRow(2, { a: 5, b: 'c' })

    expect(dataContainer.column('b')).toEqual(['a', 'a', 'c', 'b'])
  })

  test('updateRow allows only updating the desired columns', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'a', 'b', 'b']
    })

    dataContainer.updateRow(2, { b: 'c' })

    expect(dataContainer.column('b')).toEqual(['a', 'a', 'c', 'b'])
  })

  test('updateRow with unknown columns throws error', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'a', 'b', 'b']
    })

    expect(() => dataContainer.updateRow(2, { c: 'd' })).toThrow()
  })

  test('updateRow function syntax works as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'a', 'b', 'b']
    })

    dataContainer.updateRow(2, row => ({ a: row.a + 5 }))

    expect(dataContainer.column('a')).toEqual([1, 2, 8, 4])
  })

  test('deleteRow works as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'a', 'b', 'b']
    })

    dataContainer.deleteRow(2)

    expect(dataContainer.column('b')).toEqual(['a', 'a', 'b'])
  })
})
