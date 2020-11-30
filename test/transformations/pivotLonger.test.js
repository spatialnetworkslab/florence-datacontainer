import DataContainer from '../../src/index.js'

const input = [
  { col1: 1, col2: 10, col3: 'a', col4: 'aa', col5: 'aaa' },
  { col1: 2, col2: 20, col3: 'b', col4: 'bb', col5: 'bbb' },
  { col1: 3, col2: 30, col3: 'c', col4: 'cc', col5: 'ccc' }
]

const pivotInstructions = {
  columns: ['col3', 'col4', 'col5'],
  namesTo: 'name',
  valuesTo: 'value'
}

describe('pivotLonger: standalone', () => {
  it('works', () => {
    const output = new DataContainer(input)
      .pivotLonger(pivotInstructions)
      .data()

    const expectedOutput = {
      col1: [1, 1, 1, 2, 2, 2, 3, 3, 3],
      col2: [10, 10, 10, 20, 20, 20, 30, 30, 30],
      name: ['col3', 'col4', 'col5', 'col3', 'col4', 'col5', 'col3', 'col4', 'col5'],
      value: ['a', 'aa', 'aaa', 'b', 'bb', 'bbb', 'c', 'cc', 'ccc'],
      $key: ['0', '1', '2', '3', '4', '5', '6', '7', '8']
    }

    expect(output).toEqual(expectedOutput)
  })
})
