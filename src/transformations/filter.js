import getDataLength from '../utils/getDataLength.js'

export default function (data, filterFunction) {
  const length = getDataLength(data)
  const newColumns = {}
  for (const colName in data) { newColumns[colName] = [] }

  // let i = length

  // while (i--) {
  //   const row = {}
  //   for (const colName in data) { row[colName] = data[colName][i] }

  //   if (!filterFunction(row, i)) {
  //     for (const colName in data) {
  //       data[colName].splice(i, 1)
  //     }
  //   }
  // }

  for (let i = 0; i < length; i++) {
    const row = {}
    for (const colName in data) { row[colName] = data[colName][i] }

    if (filterFunction(row, i) === true) {
      for (const colName in row) { newColumns[colName].push(row[colName]) }
    }
  }

  Object.assign(data, newColumns)
}
