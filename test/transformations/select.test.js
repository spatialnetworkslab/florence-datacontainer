import DataContainer from '../../src/index.js'

describe('select transformation', () => {
  test('select works as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'b', 'a', 'b']
    }).select(['a'])

    expect(dataContainer.hasColumn('a')).toBe(true)
    expect(dataContainer.hasColumn('b')).toBe(false)
  })

  test('select throws error if columns do not exist', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4],
      b: ['a', 'b', 'a', 'b']
    })

    expect(() => dataContainer.select(['a', 'b', 'c'])).toThrow()
  })
})
