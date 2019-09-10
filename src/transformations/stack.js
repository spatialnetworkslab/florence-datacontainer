import { getColumnType } from '../utils/getDataType.js'

export default function (data, stackInstructions) {
  validateStackInstructions(stackInstructions)
  validateColumns(data, stackInstructions)

  const stackedColumns = {}
  let previousStackedColumnName

  for (const columnName of stackInstructions) {
    const unstackedColumn = data[columnName]
    const stackedColumnName = `stacked_${columnName}`

    if (!previousStackedColumnName) {
      stackedColumns[stackedColumnName] = unstackedColumn
    } else {
      const previousStackedColumn = stackedColumns[previousStackedColumnName]
      const stackedColumn = previousStackedColumn.map((value, i) => value + unstackedColumn[i])
      stackedColumns[stackedColumnName] = stackedColumn
    }

    previousStackedColumnName = stackedColumnName
  }

  Object.assign(data, stackedColumns)
}

function validateStackInstructions (stackInstructions) {
  if (!(
    stackInstructions &&
    stackInstructions.constructor === Array &&
    stackInstructions.length > 0
  )) {
    throw new Error('Invalid stack instructions')
  }
}

function validateColumns (data, stackInstructions) {
  for (const columnName of stackInstructions) {
    const column = data[columnName]

    if (!column) {
      throw new Error(`Column '${columnName}' does not exist`)
    }

    const columnType = getColumnType(column)

    if (columnType !== 'quantitative') {
      throw new Error('Stack columns can only be of type \'quantitative\'')
    }
  }
}
