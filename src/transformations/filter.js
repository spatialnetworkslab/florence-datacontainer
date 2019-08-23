import getDataLength from '../utils/getDataLength.js'

export default function (data, filterFunction) {
  const length = getDataLength(data)
  const newData = {}
  for (const colName in data) { newData[colName] = [] }

  for (let i = 0; i < length; i++) {
    const row = {}
    for (const colName in data) { row[colName] = data[colName][i] }

    if (filterFunction(row, i) === true) {
      for (const colName in row) { newData[colName].push(row[colName]) }
    }
  }

  return newData
}
