import DataContainer from '../src/index.js'

describe('checks', () => {
  test('columnIsValid returns true for valid columns', () => {
    const dataContainer = new DataContainer({ a: [1, NaN, 3] })
    expect(dataContainer.columnIsValid('a')).toBe(true)
  })

  test('columnIsValid returns false for invalid columns', () => {
    const dataContainer = new DataContainer({ a: [1, NaN, 3] })
      .mutate({ b: () => NaN })

    expect(dataContainer.columnIsValid('b')).toBe(false)
  })

  test('validateColumn throws no error for valid columns', () => {
    const dataContainer = new DataContainer({ a: [1, NaN, 3] })
    expect(() => dataContainer.validateColumn('a')).not.toThrow()
  })

  test('validateColumn throws error for invalid columns', () => {
    const dataContainer = new DataContainer({ a: [1, NaN, 3] })
      .mutate({ b: () => NaN })

    expect(() => dataContainer.validateColumn('b')).toThrow()
  })

  test('hasRow returns true if row exists', () => {
    const dataContainer = new DataContainer({ a: ['a', 'b', 'c'] })
    dataContainer.setKey('a')

    expect(dataContainer.hasRow({ index: 1 })).toBe(true)
    expect(dataContainer.hasRow({ key: 'b' })).toBe(true)
  })

  test('hasRow returns false if row does not exist', () => {
    const dataContainer = new DataContainer({ a: ['a', 'b', 'c'] })
    dataContainer.setKey('a')

    expect(dataContainer.hasRow({ index: 4 })).toBe(false)
    expect(dataContainer.hasRow({ key: 'd' })).toBe(false)
  })
})
