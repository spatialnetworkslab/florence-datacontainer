import DataContainer from '../../src/index.js'

describe('summarise transformation', () => {
  test('summarise works as expected', () => {
    const grouped = new DataContainer({ a: [1, 2, 3, 4], b: ['a', 'b', 'a', 'b'] }).groupBy('b')
    const summarised = grouped.summarise({ mean_a: { a: 'mean' } })
    expect(summarised.data()).toEqual({ b: ['a', 'b'], mean_a: [2, 3], $key: ['0', '1'] })
  })
})
