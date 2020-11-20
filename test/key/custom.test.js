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
})
