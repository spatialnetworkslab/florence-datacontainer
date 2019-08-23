import getDataLength from '../utils/getDataLength.js'

export function mutate (data, mutateInstructions) {
  const length = getDataLength(data)

  for (const key in mutateInstructions) {
    data[key] = new Array(length)
  }

  for (let i = 0; i < length; i++) {
    const row = {}
    let prevRow = {}
    let nextRow = {}

    for (const colName in data) {
      row[colName] = data[colName][i]
      prevRow[colName] = data[colName][i - 1]
      nextRow[colName] = data[colName][i + 1]
    }

    if (i === 0) { prevRow = undefined }
    if (i === length - 1) { nextRow = undefined }

    for (const key in mutateInstructions) {
      const mutateFunction = mutateInstructions[key]
      data[key][i] = mutateFunction(row, i, prevRow, nextRow)
    }
  }
}

export function transmute (data, mutateObj) {
  data = mutate(data, mutateObj)

  for (const key in data) {
    if (!(key in mutateObj)) {
      delete data[key]
    }
  }
}
