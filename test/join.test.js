import DataContainer from '../src/index.js'

describe('join', () => {
  test('join without options joins by key', () => {
    const left = new DataContainer({ a: [1, 2, 3], b: [4, 5, 6] })
    const right = new DataContainer({ c: [1, 2, 3], d: [4, 5, 6] })

    const expectedData = {
      $key: ['0', '1', '2'],
      a: [1, 2, 3],
      b: [4, 5, 6],
      c: [1, 2, 3],
      d: [4, 5, 6]
    }

    left.join(right)

    expect(left.data()).toEqual(expectedData)
  })

  test('without \'by\', right DataContainer must be longer than or of same length as left DataContainer', () => {
    const left = new DataContainer({ a: [1, 2, 3, 4], b: [5, 6, 7, 8] })
    const right1 = new DataContainer({ c: [1, 2, 3], d: [4, 5, 6] })
    const right2 = new DataContainer({ c: [1, 2, 3, 4, 5], d: [4, 5, 6, 7, 8] })

    expect(() => { left.join(right1) }).toThrow()
    expect(() => left.join(right2)).not.toThrow()
  })

  test('join throws error on conflicting column names', () => {
    const left = new DataContainer({ a: [1, 2, 3], b: [4, 5, 6] })
    const right = new DataContainer({ a: [1, 2, 3], d: [4, 5, 6] })

    expect(() => { left.join(right) }).toThrow()
  })

  test('join: \'by\' option works as expected with same data length', () => {
    const left = new DataContainer({ a: ['a', 'b', 'c'], b: [4, 5, 6] })
    const right = new DataContainer({ c: ['c', 'a', 'b'], d: [1, 2, 3] })

    const expectedData = {
      $key: ['0', '1', '2'],
      a: ['a', 'b', 'c'],
      b: [4, 5, 6],
      d: [2, 3, 1]
    }

    left.join(right, { by: ['a', 'c'] })

    expect(left.data()).toEqual(expectedData)
  })

  test('join: \'by\' option works as expected with different data length', () => {
    const left = new DataContainer({ a: ['a', 'a', 'b', 'b'], b: [1, 2, 3, 4] })
    const right = new DataContainer({ c: ['a', 'b'], d: [100, 200] })

    const expectedData = {
      $key: ['0', '1', '2', '3'],
      a: ['a', 'a', 'b', 'b'],
      b: [1, 2, 3, 4],
      d: [100, 100, 200, 200]
    }

    left.join(right, { by: ['a', 'c'] })

    expect(left.data()).toEqual(expectedData)
  })

  // test('join: \'by\' option must be an Array of two existing columns', () => {

  // })

  test('join: \'by\': column can be duplicate', () => {
    const left = new DataContainer({ a: ['a', 'b', 'c'], b: [4, 5, 6] })
    const right = new DataContainer({ a: ['c', 'a', 'b'], d: [1, 2, 3] })

    const expectedData = {
      $key: ['0', '1', '2'],
      a: ['a', 'b', 'c'],
      b: [4, 5, 6],
      d: [2, 3, 1]
    }

    expect(() => left.join(right, { by: ['a', 'a'] })).not.toThrow()
    expect(left.data()).toEqual(expectedData)
  })

  // test('join: \'by\' columns must be quantitative or categorical', () => {

  // })
})
