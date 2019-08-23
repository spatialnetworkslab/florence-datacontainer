import DataContainer from '../src/index.js'

describe('modifying rows', () => {
  test('addRow works as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'a', 'b', 'b']
    })

    dataContainer.addRow({ a: 5, b: 'c' })

    console.log(dataContainer)

    expect(dataContainer.row(4)).toEqual({ a: 5, b: 'c', $key: 4 })
  })

  test('updateRow works as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'a', 'b', 'b']
    })

    dataContainer.updateRow(2, { a: 5, b: 'c' })

    expect(dataContainer.column('b')).toEqual(['a', 'a', 'c', 'b'])
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
