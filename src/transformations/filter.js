import getDataLength from '../utils/getDataLength.js'

export default function (data, filterFunction) {
  const length = getDataLength(data)

  let i = length

  while (i--) {
    const row = {}
    for (const colName in data) { row[colName] = data[colName][i] }

    if (!filterFunction(row, i)) {
      for (const colName in data) {
        data[colName].splice(i, 1)
      }
    }
  }
}
