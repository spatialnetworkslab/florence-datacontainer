import produce from 'immer'

import { ensureValidRow, ensureValidRowUpdate, ensureRowExists } from './utils/ensureValidRow.js'
import { updateDomain } from './utils/calculateDomain.js'
import { getDataType } from './utils/getDataType.js'
import getDataLength from './utils/getDataLength.js'
import { warn } from './utils/logging.js'

const methods = {
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

    this._data.$key.push(key)
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
        if (columnName === '$key') {
          warn('Cannot update \'$key\' of row')
          continue
        }

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
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
