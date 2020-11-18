import DataContainer from '../../src/index.js'

describe('bounds', () => {
  test('works', () => {
    const dataContainer = new DataContainer(
      { a: [1, 2, 3, 4, 5, 6, 7], b: [8, 9, 10, 11, 12, 13, 14] }
    )

    const bounds = dataContainer.bounds({ column: 'a', method: 'EqualInterval', numClasses: 3 })

    expect(bounds).toEqual([3, 5])
  })

  test('throws error if column is not quantitative', () => {
    const dataContainer = new DataContainer(
      { a: [1, 2, 3, 4, 5, 6, 7], b: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }
    )

    expect(
      () => dataContainer.bounds({ column: 'b', method: 'EqualInterval', numClasses: 3 })
    ).toThrow()
  })
})
