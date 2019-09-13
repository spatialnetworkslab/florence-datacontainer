import getDataLength from '../utils/getDataLength.js'
import { getColumnType } from '../utils/getDataType.js'
import { checkRegularColumnName } from '../utils/checkFormat.js'
import { isInvalid } from '../utils/equals.js'

export default function (data, cumsumInstructions) {
  const length = getDataLength(data)
  const newColumns = {}

  for (const newColName in cumsumInstructions) {
    checkRegularColumnName(newColName)

    const oldColName = cumsumInstructions[newColName]

    if (getColumnType(data[oldColName]) !== 'quantitative') {
      throw new Error('cumsum columns can only be of type \'quantitative\'')
    }

    let currentSum = 0
    newColumns[newColName] = []

    for (let i = 0; i < length; i++) {
      const value = data[oldColName][i]

      if (!isInvalid(value)) {
        currentSum += value
      }

      newColumns[newColName].push(currentSum)
    }
  }

  Object.assign(data, newColumns)
}
