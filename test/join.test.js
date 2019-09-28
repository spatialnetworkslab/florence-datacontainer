import DataContainer from '../src/index.js'

describe('join', () => {
  test('join without options joins by key', () => {
    const left = new DataContainer({ a: [1, 2, 3], b: [4, 5, 6] })
    const right = new DataContainer({ c: [1, 2, 3], d: [4, 5, 6] })

    const expectedData = {
      a: [1, 2, 3],
      b: [4, 5, 6],
      c: [1, 2, 3],
      d: [4, 5, 6]
    }

    expect(left.join(right).data()).toEqual(expectedData)
  })

  test('DataContainers being joined must be of same length', () => {
    const left = new DataContainer({ a: [1, 2, 3, 4], b: [5, 6, 7, 8] })
    const right = new DataContainer({ c: [1, 2, 3], d: [4, 5, 6] })

    expect(() => { left.join(right) }).toThrow()
  })

  test('join throws error on conflicting column names', () => {
    const left = new DataContainer({ a: [1, 2, 3], b: [4, 5, 6] })
    const right = new DataContainer({ a: [1, 2, 3], d: [4, 5, 6] })

    expect(() => { left.join(right) }).toThrow()
  })

  test('join: \'by\' option works as expected', () => {
    const left = new DataContainer({ a: ['a', 'b', 'c'], b: [4, 5, 6] })
    const right = new DataContainer({ c: ['c', 'a', 'b'], d: [1, 2, 3] })

    const expectedData = {
      a: ['a', 'b', 'c'],
      b: [4, 5, 6],
      d: [2, 3, 1]
    }

    expect(left.join(right).data()).toEqual(expectedData)
  })

  test('join: \'by\' option must be an Array of two existing columns', () => {

  })

  test('join: \'by\': column can be duplicate', () => {
    const left = new DataContainer({ a: ['a', 'b', 'c'], b: [4, 5, 6] })
    const right = new DataContainer({ a: ['c', 'a', 'b'], d: [1, 2, 3] })

    const expectedData = {
      a: ['a', 'b', 'c'],
      b: [4, 5, 6],
      d: [2, 3, 1]
    }

    expect(() => left.join(right)).not.toThrow()
    expect(left.join(right).data()).toEqual(expectedData)
  })

  test('join: \'by\' columns must be quantitative or categorical', () => {

  })
})
