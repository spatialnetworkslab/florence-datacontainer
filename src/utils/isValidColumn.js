import { getColumnType, getDataType } from './getDataType.js'
import { findFirstValidValue } from './calculateDomain.js'
import { isInvalid } from './equals.js'

export function isValidColumn (column, columnName) {
  const columnType = getColumnType(column)

  if (columnType === undefined) return false
  if (!columnNameMatchesType(columnName, columnType)) return false
  if (!allValidValuesHaveTheSameType(column, columnType, columnName)) return false

  return true
}

export function ensureValidColumn (column, columnName) {
  const { nValidValues } = findFirstValidValue(column)

  if (nValidValues === 0) {
    throw new Error(`Invalid column '${columnName}'. Column contains only invalid values.`)
  }

  const columnType = getColumnType(column)

  if (columnType === undefined) throw new Error(`Column '${columnName}' contains data of unknown type`)
  ensureColumnNameMatchesType(columnType)
  ensureAllValidValuesHaveTheSameType(column, columnType, columnName)
}

function columnNameMatchesType (columnName, columnType) {
  if (columnName === '$geometry' && columnType !== 'geometry') return false
  if (columnName !== '$geometry' && columnType === 'geometry') return false

  return true
}

function ensureColumnNameMatchesType (columnName, columnType) {
  if (columnName === '$geometry' && columnType !== 'geometry') {
    throw new Error(`Column '$geometry' can only contain data of type 'geometry', received '${columnType}'`)
  }

  if (columnName !== '$geometry' && columnType === 'geometry') {
    throw new Error(`Only the '$geometry' column can contain data of type 'geometry'`)
  }
}

function allValidValuesHaveTheSameType (column, columnType) {
  for (let i = 0; i < column.length; i++) {
    const value = column[i]

    if (isInvalid(value)) continue

    const valueType = getDataType(value)

    if (valueType !== columnType) {
      return false
    }
  }

  return true
}

function ensureAllValidValuesHaveTheSameType (column, columnType, columnName) {
  if (!allValidValuesHaveTheSameType(column, columnType)) {
    throw new Error(`Column '${columnName}' mixes types`)
  }
}

export function columnExists (columnName, self) {
  return columnName in self._data
}

export function ensureColumnExists (columnName, self) {
  if (!columnExists(columnName, self)) {
    throw new Error(`Invalid column name: '${columnName}'`)
  }
}
