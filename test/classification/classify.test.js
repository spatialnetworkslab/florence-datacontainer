import DataContainer from '../../src/index.js'

describe('classify', () => {
  test('works when providing color scheme', () => {
    const dataContainer = new DataContainer(
      { a: [1, 2, 3, 4, 5, 6, 7], b: [8, 9, 10, 11, 12, 13, 14] }
    )

    const scale = dataContainer.classify(
      { column: 'a', method: 'EqualInterval', numClasses: 3 },
      ['red', 'blue', 'green']
    )

    expect(scale.range().length).toBe(3)
    expect(scale(2)).toBe('red')
    expect(scale(4)).toBe('blue')
    expect(scale(6)).toBe('green')
  })
})
