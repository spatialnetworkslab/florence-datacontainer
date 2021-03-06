import DataContainer from '../../src/index.js'

describe('transform transformation', () => {
  test('transform works as expected', () => {
    const dataContainer = new DataContainer({ a: [1, 2, 3, 4] })
    const transformed = dataContainer.transform(columns => {
      const b = columns.a.map(a => a ** 2)
      return { b }
    })

    expect(transformed.column('b')).toEqual([1, 4, 9, 16])
  })
})
