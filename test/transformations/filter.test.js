import DataContainer from '../../src/index.js'

describe('filter transformation', () => {
  test('filter works as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5],
      b: ['a', 'b', 'c', 'd', 'e']
    })

    const filteredDataContainer = dataContainer.filter(row => row.a > 2)

    expect(filteredDataContainer.column('a')).toEqual([3, 4, 5])
    expect(filteredDataContainer.column('b')).toEqual(['c', 'd', 'e'])
  })

  test('filter doesn\'t throw error on empty DataContainer', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5],
      b: ['a', 'b', 'c', 'd', 'e']
    })

    expect(() => dataContainer.filter(row => row.a > 5)).not.toThrow()
  })
})
