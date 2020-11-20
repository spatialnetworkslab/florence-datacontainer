import DataContainer from '../../src/index.js'

describe('custom key functionality', () => {
  test('setting key works', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'd', 'e', 'f']
    })

    dataContainer.setKey('b')

    expect(dataContainer.column('$key')).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  test('resetting key works', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'd', 'e', 'f']
    })

    dataContainer.setKey('b')
    dataContainer.resetKey()

    expect(dataContainer.column('$key')).toEqual([0, 1, 2, 3, 4, 5])
  })

  test('accessing row with custom key works', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'd', 'e', 'f']
    })

    dataContainer.setKey('b')

    expect(dataContainer.row({ key: 'f' })).toEqual({ a: 6, b: 'f', $key: 'f' })
  })

  test('adding row: key is added as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'd', 'e', 'f']
    })

    dataContainer.setKey('b')
    dataContainer.addRow({ a: 7, b: 'g' })

    expect(dataContainer.column('$key')).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  })

  test('adding row throws if key already exists', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'd', 'e', 'f']
    })

    dataContainer.setKey('b')

    expect(
      () => dataContainer.addRow({ a: 2, b: 'b' })
    ).toThrow()
  })

  test('updating row with custom key works', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'd', 'e', 'f']
    })

    dataContainer.setKey('b')
    dataContainer.updateRow({ key: 'c' }, { a: 300 })

    expect(dataContainer.column('a')).toEqual([1, 2, 300, 4, 5, 6])
  })

  test('updating row: key is added as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5, 6],
      b: ['a', 'b', 'c', 'd', 'e', 'f']
    })

    dataContainer.setKey('b')
    dataContainer.updateRow({ key: 'c' }, { a: 300, b: 'ccc' })

    expect(dataContainer.column('$key')).toEqual()
  })

  test('updating row throws if key already exists', () => {

  })

  test('deleting row with custom key works', () => {

  })

  test('deleting row: key is removed as expected', () => {

  })
})
