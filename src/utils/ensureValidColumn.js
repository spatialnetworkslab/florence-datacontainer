import { getColumnType } from './getDataType.js'

export function ensureValidColumn (column, columnName) {
  const columnType = getColumnType(column)

  ensureColumnNameMatchesType(columnName, columnType)
  ensureAllValidValuesHaveTheSameType(column, columnType)
}

function ensureColumnNameMatchesType (columnName, columnType) {

}

function ensureAllValidValuesHaveTheSameType (column, columnType) {

}
