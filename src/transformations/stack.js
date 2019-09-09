import getDataLength from '../utils/getDataLength.js'
import { getColumnType } from '../utils/getDataType.js'

export default function (data, stackInstructions) {
  validateStackInstructions(stackInstructions)
  validateColumns(data, stackInstructions)

  const dataLength = getDataLength(data)

  // TODO
}

function validateStackInstructions (stackInstructions) {
  if (
    stackInstructions &&
    stackInstructions.constructor === Array &&
    stackInstructions.length > 0
  ) {
    return
  }

  throw new Error('Invalid stack instructions')
}

function validateColumns (data, stackInstructions) {
  let dataType

  for (const colName in stackInstructions) {
    const column = data[colName]

    if (!column) {
      throw new Error(`Column '${colName}' does not exist`)
    }

    const colType = getColumnType(column)

    if (!['quantitative', 'temporal'].includes(colType)) {
      throw new Error('Stack columns can only be of types \'quantitative\' or \'temporal\'')
    }

    if (dataType) {
      if (dataType !== colType) {
        throw new Error('Stack columns must all be of the same type.')
      }
    } else {
      dataType = colType
    }
  }
}
