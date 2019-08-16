import { getColumnType, getDataType } from './getDataType.js'
import { isInvalid } from '../helpers/equals.js'

export function isValidColumn (column, columnName, { throwError = true }) {
  const columnType = getColumnType(column, { throwError })

  if (columnType === undefined) return false
  if (!columnNameMatchesType(columnName, columnType, { throwError })) return false
  if (!allValidValuesHaveTheSameType(column, columnType, columnName, { throwError })) return false

  return true
}

function columnNameMatchesType (columnName, columnType, { throwError }) {
  if (columnName === '$geometry' && columnType !== 'geometry') {
    if (throwError) {
      throw new Error(`Column '$geometry' can only contain data of type 'geometry', received '${columnType}'`)
    } else {
      return false
    }
  }

  if (columnName !== '$geometry' && columnType === 'geometry') {
    if (throwError) {
      throw new Error(`Only the '$geometry' column can contain data of type 'geometry'`)
    } else {
      return false
    }
  }

  return true
}

function allValidValuesHaveTheSameType (column, columnType, columnName, { throwError }) {
  for (let i = 0; i < column.length; i++) {
    const value = column[i]

    if (isInvalid(value)) continue

    const valueType = getDataType(value)

    if (valueType !== columnType) {
      if (throwError) {
        throw new Error(`Column '${columnName}' mixes types '${columnType}' and '${valueType}'`)
      } else {
        return false
      }
    }
  }

  return true
}
