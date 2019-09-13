import { getColumnType } from '../utils/getDataType.js'
import { checkRegularColumnName } from '../utils/checkFormat.js'

export default function (data, _cumsumInstructions) {
  const cumsumInstructions = parseCumsumInstructions(_cumsumInstructions)
  validateColumns(data, cumsumInstructions)

  const rowCumsumColumns = {}
  let previousColumnName

  for (const [newName, oldName] of cumsumInstructions) {
    checkRegularColumnName(newName)
    const oldColumn = data[oldName]

    if (previousColumnName === undefined) {
      rowCumsumColumns[newName] = oldColumn
    } else {
      const previousColumn = rowCumsumColumns[previousColumnName]
      const newColumn = oldColumn.map((value, i) => value + previousColumn[i])
      rowCumsumColumns[newName] = newColumn
    }

    previousColumnName = newName
  }

  Object.assign(data, rowCumsumColumns)
}

const invalidInstructionsError = new Error('Invalid rowCumsum instrutions')

function parseCumsumInstructions (cumsumInstructions) {
  if (cumsumInstructions && cumsumInstructions.constructor === Array) {
    const parsedInstructions = []

    for (const instruction of cumsumInstructions) {
      validateInstruction(instruction)

      if (instruction.constructor === String) {
        parsedInstructions.push([instruction, instruction])
      }

      if (instruction.constructor === Object) {
        const newName = Object.keys(instruction)[0]
        const oldName = instruction[newName]
        parsedInstructions.push([newName, oldName])
      }
    }

    return parsedInstructions
  }

  throw invalidInstructionsError
}

function validateInstruction (instruction) {
  if (instruction.constructor === String) return

  if (instruction.constructor === Object) {
    if (Object.keys(instruction).length === 1) return
  }

  throw invalidInstructionsError
}

function validateColumns (data, stackInstructions) {
  for (const [, oldName] of stackInstructions) {
    const column = data[oldName]

    if (!column) {
      throw new Error(`Column '${oldName}' does not exist`)
    }

    const columnType = getColumnType(column)

    if (columnType !== 'quantitative') {
      throw new Error('rowCumsum columns can only be of type \'quantitative\'')
    }
  }
}
