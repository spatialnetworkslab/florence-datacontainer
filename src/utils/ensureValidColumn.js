import { getColumnType, getDataType } from './getDataType.js'
import { isInvalid } from '../helpers/equals.js'

export function ensureValidColumn (column, columnName) {
  const columnType = getColumnType(column)

  ensureColumnNameMatchesType(columnName, columnType)
  ensureAllValidValuesHaveTheSameType(column, columnType, columnName)
}

function ensureColumnNameMatchesType (columnName, columnType) {
  if (columnName === '$geometry' && columnType !== 'geometry') {
    throw new Error(`Column '$geometry' can only contain data of type 'geometry', received '${columnType}'`)
  }

  if (columnName !== '$geometry' && columnType === 'geometry') {
    throw new Error(`Only the '$geometry' column can contain data of type 'geometry'`)
  }
}

function ensureAllValidValuesHaveTheSameType (column, columnType, columnName) {
  for (let i = 0; i < column.length; i++) {
    const value = column[i]

    if (isInvalid(value)) continue

    const valueType = getDataType(value)

    if (valueType !== columnType) {
      throw new Error(`Column '${columnName}' mixes types '${columnType}' and '${valueType}'`)
    }
  }
}
