import DataContainer from '../../src/index.js'

const dataContainer = new DataContainer({
  a: [1, 2, 3, 4, 5, 6],
  b: ['a', 'b', 'c', 'd', 'e', 'f']
})

const filtered = dataContainer.filter(row => row.a > 2)

describe('accessing rows', () => {
  test('row throws on invalid argument', () => {
    const accessRow = arg => () => dataContainer.row(arg)

    const int = 2
    const str = '2'
    const none = undefined
    const wrongObj = { index: 0, key: 2 }
    const wrongObj2 = { foo: 'bar' }

    expect(accessRow(int)).toThrow()
    expect(accessRow(str)).toThrow()
    expect(accessRow(none)).toThrow()
    expect(accessRow(wrongObj)).toThrow()
    expect(accessRow(wrongObj2)).toThrow()
  })

  test('row works with index', () => {
    expect(dataContainer.row({ index: 2 })).toEqual({ a: 3, b: 'c', $key: 2 })
    expect(filtered.row({ index: 2 })).toEqual({ a: 5, b: 'e', $key: 4 })
  })

  test('row works with key', () => {
    expect(dataContainer.row({ key: 2 })).toEqual({ a: 3, b: 'c', $key: 2 })
    expect(filtered.row({ key: 2 })).toEqual({ a: 3, b: 'c', $key: 2 })
  })
})
