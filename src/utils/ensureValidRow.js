import { getDataType } from './getDataType.js'
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

      if (isInvalid(value)) {
        continue
      }

      const columnType = self._types[columnName]
      const valueType = getDataType(value)

      if (columnType !== valueType) {
        throw new Error(`Column '${columnName}' is of type '${columnType}'. Received value of type '${valueType}'`)
      }
    }
  }
}

export function ensureRowExists (key, self) {
  if (isUndefined(self._keyToRowNumber[key])) {
    throw new Error(`Key '${key}' not found`)
  }
}
