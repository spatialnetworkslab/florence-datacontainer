import DataContainer from '../../src/index.js'

describe('modifying columns', () => {
  test('addColumn works as expected', () => {
    const dataContainer = new DataContainer({ a: [1, 2], b: ['a', 'b'] })
    dataContainer.addColumn('c', ['y', 'z'])

    expect(dataContainer.column('c')).toEqual(['y', 'z'])
  })

  test('addColumn: column name must not exist', () => {
    const dataContainer = new DataContainer({ a: [1, 2], b: ['a', 'b'] })

    expect(() => dataContainer.addColumn('b', ['y', 'z'])).toThrow()
  })

  test('addColumn: column must be of right length', () => {
    const dataContainer = new DataContainer({ a: [1, 2], b: ['a', 'b'] })

    expect(() => dataContainer.addColumn('c', ['x', 'y', 'z'])).toThrow()
  })

  test('replaceColumn works as expected', () => {
    const dataContainer = new DataContainer({ a: [1, 2], b: ['a', 'b'] })
    dataContainer.replaceColumn('b', ['y', 'z'])

    expect(dataContainer.column('b')).toEqual(['y', 'z'])
  })

  test('deleteColumn works as expected', () => {
    const dataContainer = new DataContainer({ a: [1, 2], b: ['a', 'b'] })
    dataContainer.deleteColumn('b')

    expect(dataContainer.hasColumn('b')).toBe(false)
  })

  test('deleteColumn: it is not possible to delete the last column', () => {
    const dataContainer = new DataContainer({ a: [1, 2], b: ['a', 'b'] })
    dataContainer.deleteColumn('b')

    expect(() => dataContainer.deleteColumn('a')).toThrow()
  })

  test('deleteColumn: it is not possible to delete the key column', () => {
    const dataContainer = new DataContainer({ a: [1, 2], b: ['a', 'b'] })

    expect(() => dataContainer.deleteColumn('$key')).toThrow()
  })
})
