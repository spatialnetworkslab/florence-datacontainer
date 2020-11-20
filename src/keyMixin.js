import { generateKeyColumn, validateKeyColumn } from './utils/key.js'
import getDataLength from './utils/getDataLength.js'

const methods = {
  _setupKeyColumn () {
    const length = getDataLength(this._data)

    if ('$key' in this._data) {
      validateKeyColumn(this._data.$key, length)
      this._syncKeyToRowIndex()
    } else {
      const keyColumn = generateKeyColumn(length)
      this._setKeyColumn(keyColumn)
    }
  },

  _setKeyColumn (keyColumn) {
    this._data.$key = keyColumn

    this._syncKeyToRowIndex()
  },

  _syncKeyToRowIndex () {
    const length = getDataLength(this._data)

    for (let i = 0; i < length; i++) {
      const key = this._data.$key[i]
      this._keyToRowIndex[key] = i
    }
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
