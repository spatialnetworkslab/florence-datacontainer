import getDataLength from '../utils/getDataLength.js'
import { getColumnType } from '../utils/getDataType.js'
import { checkRegularColumnName } from '../utils/checkFormat.js'
import { isInvalid } from '../utils/equals.js'

export default function (data, cumsumInstructions, options = { asInterval: false }) {
  const asInterval = options.asInterval
  const length = getDataLength(data)
  const newColumns = {}

  for (const newColName in cumsumInstructions) {
    checkRegularColumnName(newColName)

    const oldColName = cumsumInstructions[newColName]

    if (getColumnType(data[oldColName]) !== 'quantitative') {
      throw new Error('cumsum columns can only be of type \'quantitative\'')
    }

    let previousSum = 0
    let currentSum = 0
    newColumns[newColName] = []

    for (let i = 0; i < length; i++) {
      const value = data[oldColName][i]

      if (!isInvalid(value)) {
        currentSum += value
      }

      if (asInterval) {
        newColumns[newColName].push([previousSum, currentSum])
      } else {
        newColumns[newColName].push(currentSum)
      }

      previousSum = currentSum
    }
  }

  Object.assign(data, newColumns)
}
