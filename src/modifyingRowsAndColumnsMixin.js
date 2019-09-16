import produce from 'immer'

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
    const self = this

    this._data = produce(this._data, draft => {
      for (const columnName in row) {
        const value = row[columnName]
        draft[columnName].push(value)

        self._updateDomainIfNecessary(columnName, value)
      }
    })

    const rowNumber = getDataLength(this._data) - 1
    const keyDomain = this.domain('$key')
    keyDomain[1]++
    const key = keyDomain[1]

    this._data = produce(this._data, draft => {
      draft.$key.push(key)
    })

    this._keyToRowNumber[key] = rowNumber
  },

  updateRow (key, row) {
    if (row.constructor === Function) {
      const result = row(this.row(key))

      if (!(result && result.constructor === Object)) {
        throw new Error('updateRow function must return Object')
      }

      this.updateRow(key, result)
    }

    ensureRowExists(key, this)
    ensureValidRowUpdate(row, this)
    const self = this
    const rowNumber = this._keyToRowNumber[key]

    this._data = produce(this._data, draft => {
      for (const columnName in row) {
        throwErrorIfColumnIsKey(columnName)

        const value = row[columnName]
        draft[columnName][rowNumber] = value

        self._resetDomainIfNecessary(columnName)
      }
    })
  },

  deleteRow (key) {
    ensureRowExists(key, this)
    const self = this
    const rowNumber = this._keyToRowNumber[key]
    delete this._keyToRowNumber[key]

    this._data = produce(this._data, draft => {
      for (const columnName in draft) {
        draft[columnName].splice(rowNumber, 1)
        self._resetDomainIfNecessary(columnName)
      }
    })
  },

  // Columns
  addColumn (columnName, column) {
    this._validateNewColumn(columnName, column)

    this._data = produce(this._data, draft => {
      draft[columnName] = column
    })
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

    this._data = produce(this._data, draft => {
      delete draft[columnName]
    })
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
