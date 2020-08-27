import getDataLength from '../utils/getDataLength.js'

export function mutate (data, mutateInstructions) {
  const length = getDataLength(data)
  const newData = initNewData(data, mutateInstructions)

  for (let i = 0; i < length; i++) {
    const row = {}

    for (const columnName in data) {
      row[columnName] = data[columnName][i]
    }

    for (const columnName in mutateInstructions) {
      const mutateFunction = mutateInstructions[columnName]
      newData[columnName][i] = mutateFunction(row, i)
    }
  }

  return newData
}

export function transmute (data, transmuteInstructions) {
  const newData = mutate(data, transmuteInstructions)

  for (const columnName in newData) {
    if (!(columnName in transmuteInstructions)) {
      delete newData[columnName]
    }
  }

  return newData
}

function initNewData (data, mutateInstructions) {
  const length = getDataLength(data)
  const newData = Object.assign({}, data)

  const dataColumns = new Set(Object.keys(data))
  const mutateColumns = new Set(Object.keys(mutateInstructions))

  for (const columnName of mutateColumns) {
    if (!dataColumns.has(columnName)) {
      newData[columnName] = new Array(length).fill(undefined)
    }
  }

  return newData
}
