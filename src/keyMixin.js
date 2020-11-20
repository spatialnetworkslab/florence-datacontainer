import { generateKeyColumn, validateKeyColumn } from './utils/key.js'
import getDataLength from './utils/getDataLength.js'

const methods = {
  keys () {
    return this.column('$key')
  },

  setKey (columnName) {
    const column = this.column(columnName)
    const length = getDataLength(this._data) 
    validateKeyColumn(column, length)

    this._setKeyColumn(column)
  },

  resetKey () {
    delete this._data.$key
    this._setupKeyColumn()
  },

  _setupKeyColumn () {
    const length = getDataLength(this._data)

    if ('$key' in this._data) {
      validateKeyColumn(this._data.$key, length)
      this._constructKeyToRowIndex()
    } else {
      const keyColumn = generateKeyColumn(length)
      this._setKeyColumn(keyColumn)
    }
  },

  _setKeyColumn (keyColumn) {
    this._data.$key = keyColumn
    this._constructKeyToRowIndex()
  },

  _constructKeyToRowIndex () {
    const length = getDataLength(this._data)

    for (let i = 0; i < length; i++) {
      const key = this._data.$key[i]
      this._keyToRowIndex.set(key, i)
    }
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
