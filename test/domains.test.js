import DataContainer from '../src/index.js'
import { valid } from './__data__/makeGeoJSON.js'

describe('calculating domains', () => {
  // quantitative
  test('the domain of a quantitative column are the lowest and highest numbers', () => {
    const data = { quantity: [20, 1, -200, 50, 12] }
    const dataContainer = new DataContainer(data)

    expect(dataContainer.domain('quantity')).toEqual([-200, 50])
  })

  test('quantitative domain ignores Infinity', () => {
    const data = { quantity: [-20, Infinity, 199, 31, -1, -Infinity] }
    const dataContainer = new DataContainer(data)

    expect(dataContainer.domain('quantity')).toEqual([-20, 199])
  })

  test('only one non-missing value v in a quantitative column: domain = [v-1, v+1]', () => {
    const data = { a: [undefined, NaN, 15, null] }
    const dataContainer = new DataContainer(data)

    expect(dataContainer.domain('a')).toEqual([14, 16])
  })

  // categorical
  test('the domain of a categorical column are the unique values in the column', () => {
    const data = { categories: ['a', 'a', 'c', 'b', null, 'd', 'd', 'd'] }
    const dataContainer = new DataContainer(data)

    expect(dataContainer.domain('categories')).toEqual(['a', 'c', 'b', 'd'])
  })

  // temporal
  test('the domain of a temporal column are the earliest and latest date', () => {
    const data = { date: [new Date(2008, 11, 1), new Date(2016, 4, 27), new Date(2012, 2, 2)] }
    const dataContainer = new DataContainer(data)

    expect(dataContainer.domain('date')).toEqual([new Date(2008, 11, 1), new Date(2016, 4, 27)])
  })

  test('only one non-missing date d in a temporal column: domain = [d - 1 day, d + 1 day]', () => {
    const data = { date: [null, NaN, undefined, new Date(2001, 2, 3)] }
    const dataContainer = new DataContainer(data)

    expect(dataContainer.domain('date')).toEqual([new Date(2001, 2, 2), new Date(2001, 2, 4)])
  })

  // interval
  test('the domain of a interval column are the lowest and highest values within the intervals', () => {
    const data = { bins: [[0, 10], [58, -1], [-2, 3]] }
    const dataContainer = new DataContainer(data)

    expect(dataContainer.domain('bins')).toEqual([-2, 58])
  })

  test('the domain of an interval column with only one interval is the lowest and highest values of that interval', () => {
    const data = { bins: [[200, 100], undefined] }
    const dataContainer = new DataContainer(data)

    expect(dataContainer.domain('bins')).toEqual([100, 200])
  })

  // geometry
  test('the domain of a geometry column is the bounding box of the geometries', () => {
    const dataContainer = new DataContainer(valid())

    expect(dataContainer.domain('$geometry')).toEqual({
      x: [52, 102],
      y: [0.5, 30.5]
    })
  })

  // grouped
  test('requesting the the domain of a \'$grouped\' column throws an error', () => {
    const data = {
      category: ['a', 'a', 'b', 'b', 'c', 'c'],
      amount: [10, 15, 7, 2, 19, 13]
    }

    const dataContainer = new DataContainer(data)
    const groupedDataContainer = dataContainer.groupBy('category')

    expect(() => groupedDataContainer.domain('$grouped')).toThrow()
  })

  // addRow
  test('domain is correct after adding row', () => {
    const dataContainer = new DataContainer({
      a: [1, 2],
      b: ['apple', 'banana']
    })

    dataContainer.domain('a')
    dataContainer.domain('b')

    dataContainer.addRow({ a: 3, b: 'coconut' })

    expect(dataContainer.domain('a')).toEqual([1, 3])
    expect(dataContainer.domain('b')).toEqual(['apple', 'banana', 'coconut'])
  })

  // updateRow
  test('domain is correct after updating row', () => {
    const dataContainer = new DataContainer({
      a: [1, 2],
      b: ['apple', 'banana']
    })

    dataContainer.domain('a')
    dataContainer.domain('b')

    dataContainer.updateRow(0, { a: 3, b: 'coconut' })

    expect(dataContainer.domain('a')).toEqual([2, 3])
    expect(dataContainer.domain('b')).toEqual(['coconut', 'banana'])
  })

  // deleteRow
  test('domain is correct after deleting row', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3],
      b: ['apple', 'banana', 'coconut']
    })

    dataContainer.domain('a')
    dataContainer.domain('b')

    dataContainer.deleteRow(0)

    expect(dataContainer.domain('a')).toEqual([2, 3])
    expect(dataContainer.domain('b')).toEqual(['banana', 'coconut'])
  })

  // Empty
  test('domain is empty Array for empty column', () => {
    const dataContainer = new DataContainer({
      a: [1, 2, 3],
      b: ['apple', 'banana', 'coconut']
    }).filter(row => row.a > 3)

    expect(dataContainer.domain('a')).toEqual([])
    expect(dataContainer.domain('b')).toEqual([])
  })
})
