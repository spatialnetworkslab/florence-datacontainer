import DataContainer from '../../src/index.js'

describe('various simple transformations', () => {
  test('filter works as expected', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3, 4, 5],
      b: ['a', 'b', 'c', 'd', 'e']
    })

    const filteredDataContainer = dataContainer.filter(row => row.a > 2)

    expect(filteredDataContainer.column('a')).toEqual([3, 4, 5])
    expect(filteredDataContainer.column('b')).toEqual(['c', 'd', 'e'])
  })
})