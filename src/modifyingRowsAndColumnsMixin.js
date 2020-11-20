import { checkRegularColumnName } from './utils/checkFormat.js'
import { ensureValidRow, ensureValidRowUpdate, ensureRowExists } from './utils/ensureValidRow.js'
import { ensureValidColumn, ensureColumnExists } from './utils/isValidColumn.js'
import { updateDomain } from './utils/calculateDomain.js'
import { getDataType } from './utils/getDataType.js'
import getDataLength from './utils/getDataLength.js'

const methods = {
  // Rows
  addRow (row) {
    ensureValidRow(row, this)

    for (const columnName in row) {
      const value = row[columnName]
      this._data[columnName].push(value)

      this._updateDomainIfNecessary(columnName, value)
    }

    const rowIndex = getDataLength(this._data) - 1

    if (!this._keyColumn) {
      const keyDomain = this.domain('$key')
      keyDomain[1]++
      const key = keyDomain[1]

      this._data.$key.push(key)
      this._keyToRowIndex.set(key, rowIndex)
    }

    if (this._keyColumn) {
      const key = row[this._keyColumn]

      if (this._keyToRowIndex.has(key)) {
        throw new Error(`Duplicate key '${key}'`)
      }

      this._keyToRowIndex.set(key, rowIndex)
    }
  },

  updateRow (accessorObject, row) {
    if (row.constructor === Function) {
      const result = row(this.row(accessorObject))

      if (!(result && result.constructor === Object)) {
        throw new Error('updateRow function must return Object')
      }

      this.updateRow(accessorObject, result)
    }

    ensureRowExists(accessorObject, this)
    ensureValidRowUpdate(row, this)

    const rowIndex = this._rowIndex(accessorObject)

    if (this._keyColumn && this._keyColumn in row) {
      const oldKey = this._row(rowIndex).$key
      const newKey = row[this._keyColumn]

      if (
        newKey !== oldKey &&
        this._keyToRowIndex.has(newKey)
      ) {
        throw new Error(`Duplicate key '${newKey}'`)
      }

      this._keyToRowIndex.delete(oldKey)
      this._keyToRowIndex.set(newKey, rowIndex)
    }

    for (const columnName in row) {
      throwErrorIfColumnIsKey(columnName)

      const value = row[columnName]
      this._data[columnName][rowIndex] = value

      this._resetDomainIfNecessary(columnName)
    }
  },

  deleteRow (accessorObject) {
    ensureRowExists(accessorObject, this)

    const rowIndex = this._rowIndex(accessorObject)
    const key = this._row(rowIndex).$key

    this._keyToRowIndex.delete(key)

    for (const columnName in this._data) {
      if (!(this._keyColumn && columnName === '$key')) {
        this._data[columnName].splice(rowIndex, 1)
        this._resetDomainIfNecessary(columnName)
      }
    }
  },

  // Columns
  addColumn (columnName, column) {
    this._validateNewColumn(columnName, column)
    this._data[columnName] = column
  },

  replaceColumn (columnName, column) {
    this.deleteColumn(columnName)
    this.addColumn(columnName, column)
  },

  deleteColumn (columnName) {
    ensureColumnExists(columnName, this)
    throwErrorIfColumnIsKey(columnName)

    if (Object.keys(this._data).length === 2) {
      throw new Error('Cannot delete last column')
    }

    delete this._data[columnName]
  },

  // Private methods
  _updateDomainIfNecessary (columnName, value) {
    const type = getDataType(value)

    if (columnName in this._domains) {
      this._domains[columnName] = updateDomain(
        this._domains[columnName],
        value,
        type
      )
    }
  },

  _resetDomainIfNecessary (columnName) {
    if (columnName in this._domains) {
      delete this._domains[columnName]
    }
  },

  _validateNewColumn (columnName, column) {
    checkRegularColumnName(columnName)

    if (columnName in this._data) {
      throw new Error(`Column '${columnName}' already exists`)
    }

    const dataLength = getDataLength(this._data)
    if (dataLength !== column.length) {
      throw new Error('Column must be of same length as rest of data')
    }

    ensureValidColumn(column)
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}

function throwErrorIfColumnIsKey (columnName) {
  if (columnName === '$key') throw new Error('Cannot modify key column')
}
