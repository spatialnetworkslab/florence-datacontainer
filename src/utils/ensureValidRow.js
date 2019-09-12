import { getDataType, getColumnType, ensureValidDataType } from './getDataType.js'
import { isInvalid, isUndefined } from './equals.js'

export function ensureValidRow (row, self) {
  for (const columnName in row) {
    if (!(columnName in self._data)) throw new Error(`Column '${columnName}' not found`)
  }

  for (const columnName in self._data) {
    if (columnName === '$key') {
      if (columnName in row) throw new Error('Cannot set \'$key\' column')
    } else {
      if (!(columnName in row)) throw new Error(`Missing column '${columnName}'`)

      const value = row[columnName]
      ensureValueIsRightForColumn(value, columnName, self)
    }
  }
}

export function ensureValidRowUpdate (row, self) {
  for (const columnName in row) {
    if (!(columnName in self._data)) throw new Error(`Column '${columnName}' not found`)

    const value = row[columnName]
    ensureValueIsRightForColumn(value, columnName, self)
  }
}

export function ensureRowExists (key, self) {
  if (isUndefined(self._keyToRowNumber[key])) {
    throw new Error(`Key '${key}' not found`)
  }
}

function ensureValueIsRightForColumn (value, columnName, self) {
  if (!isInvalid(value)) {
    const columnType = getColumnType(self._data[columnName])

    ensureValidDataType(value)
    const valueType = getDataType(value)

    if (columnType !== valueType) {
      throw new Error(`Column '${columnName}' is of type '${columnType}'. Received value of type '${valueType}'`)
    }
  }
}
