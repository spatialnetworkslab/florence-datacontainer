import DataContainer from '../../src/index.js'

describe('pivotWider: standalone', () => {
  it('works (values complete)', () => {
    const input = [
      { idCol: 'a', names: 'x', values: 1 },
      { idCol: 'a', names: 'y', values: 2 },
      { idCol: 'a', names: 'z', values: 3 },
      { idCol: 'b', names: 'x', values: 10 },
      { idCol: 'b', names: 'y', values: 20 },
      { idCol: 'b', names: 'z', values: 30 },
      { idCol: 'c', names: 'x', values: 100 },
      { idCol: 'c', names: 'y', values: 200 },
      { idCol: 'c', names: 'z', values: 300 }
    ]

    const pivotInstructions = { namesFrom: 'names', valuesFrom: 'values' }

    const output = new DataContainer(input)
      .pivotWider(pivotInstructions)
      .data()

    const expectedOutput = {
      idCol: ['a', 'b', 'c'],
      x: [1, 10, 100],
      y: [2, 20, 200],
      z: [3, 30, 300]
    }

    expect(output).toEqual(expectedOutput)
  })

  it('works (values missing)', () => {
    const input = [
      { idCol: 'a', names: 'x', values: 1 },
      { idCol: 'a', names: 'y', values: 2 },
      { idCol: 'b', names: 'x', values: 10 },
      { idCol: 'b', names: 'y', values: 20 },
      { idCol: 'b', names: 'z', values: 30 },
      { idCol: 'c', names: 'x', values: 100 },
      { idCol: 'c', names: 'z', values: 300 }
    ]

    const pivotInstructions = { namesFrom: 'names', valuesFrom: 'values' }

    const output = new DataContainer(input)
      .pivotWider(pivotInstructions)
      .data()

    const expectedOutput = {
      idCol: ['a', 'b', 'c'],
      x: [1, 10, 100],
      y: [2, 20, null],
      z: [null, 30, 300]
    }

    expect(output).toEqual(expectedOutput)
  })

  it('works (values, missing custom fill value)', () => {
    const input = [
      { idCol: 'a', names: 'x', values: 1 },
      { idCol: 'a', names: 'y', values: 2 },
      { idCol: 'b', names: 'x', values: 10 },
      { idCol: 'b', names: 'y', values: 20 },
      { idCol: 'b', names: 'z', values: 30 },
      { idCol: 'c', names: 'x', values: 100 },
      { idCol: 'c', names: 'z', values: 300 }
    ]

    const pivotInstructions = {
      namesFrom: 'names',
      valuesFrom: 'values',
      valuesFill: NaN
    }

    const output = new DataContainer(input)
      .pivotWider(pivotInstructions)
      .data()

    const expectedOutput = {
      idCol: ['a', 'b', 'c'],
      x: [1, 10, 100],
      y: [2, 20, NaN],
      z: [NaN, 30, 300]
    }

    expect(output).toEqual(expectedOutput)
  })
})
