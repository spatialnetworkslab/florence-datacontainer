import { getDataType, ensureValidDataType } from '../utils/getDataType.js'

export default function (data, sortInstructions) {
  if (sortInstructions.constructor === Object) {
    return sort(data, sortInstructions)
  } else if (sortInstructions.constructor === Array) {
    let newData

    for (let i = sortInstructions.length - 1; i >= 0; i--) {
      const instruction = sortInstructions[i]

      newData = sort(
        newData ? data : newData,
        instruction
      )
    }

    return newData
  } else {
    throw new Error('arrange requires a key-value object or array of key-value objects')
  }
}

const sortFuncs = {
  quantitative: {
    // https://beta.observablehq.com/@mbostock/manipulating-flat-arrays
    ascending: (a, b) => a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN,
    descending: (a, b) => b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN
  },
  categorical: {
    ascending: (a, b) => {
      const sorted = [a, b].sort()
      return sorted[0] === a ? -1 : 1
    },
    descending: (a, b) => {
      const sorted = [a, b].sort()
      return sorted[0] === a ? 1 : -1
    }
  },
  temporal: {
    ascending: (a, b) => {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN
    },
    descending: (a, b) => {
      return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN
    }
  }
}

function sort (data, sortInstructions) {
  if (Object.keys(sortInstructions).length !== 1) {
    throw new Error('Only one key-value pair allowed')
  }

  const variable = Object.keys(sortInstructions)[0]
  const sortMethod = sortInstructions[variable]

  ensureValidDataType(data[variable][0])
  const dataType = getDataType(data[variable][0])

  let sortFunc
  if (sortMethod.constructor === String) {
    sortFunc = sortFuncs[dataType][sortMethod]
  }
  if (sortMethod.constructor === Function) {
    sortFunc = sortMethod
  }

  const column = data[variable]

  const indices = column.map((v, i) => i)
  const sortedIndices = indices.sort((a, b) => sortFunc(column[a], column[b]))

  const newData = {}

  for (const colName in data) {
    newData[colName] = reorder(data[colName], sortedIndices)
  }

  return newData
}

function reorder (column, indices) {
  return indices.map(i => column[i])
}
