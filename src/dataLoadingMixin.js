import produce from 'immer'

import { checkFormatColumnData, checkFormatInternal } from './utils/checkFormat.js'
import { isUndefined } from './utils/equals.js'
import { generateKeyColumn, validateKeyColumn } from './utils/key.js'

import getDataLength from './utils/getDataLength.js'
import convertRowToColumnData from './utils/convertRowToColumnData.js'
import parseGeoJSON from './utils/parseGeoJSON.js'

const methods = {
  _setColumnData (data, options) {
    if (options.validate === false) {
      checkFormatInternal(data)
    } else {
      checkFormatColumnData(data)
    }

    this._storeData(data, options)
  },

  _setRowData (rowData, options) {
    const columnData = convertRowToColumnData(rowData)
    this._setColumnData(columnData, options)
  },

  _setGeoJSON (geojsonData, options) {
    const data = parseGeoJSON(geojsonData)
    this._storeData(data, options)
  },

  _setGroup (group, options) {
    const data = group.data
    checkFormatInternal(data)
    this._storeData(data, options)
  },

  _storeData (data, options) {
    this._data = data

    this._setupKeyColumn(options.key)

    if (options.validate === true) {
      this.validateAllColumns()
    }
  },

  _setupKeyColumn (key) {
    const length = getDataLength(this._data)

    if ('$key' in this._data) {
      validateKeyColumn(this._data.$key, length)
      this._syncKeyToRowNumber()
      return
    }

    if (isUndefined(key)) {
      const keyColumn = generateKeyColumn(length)
      this._setKeyColumn(keyColumn)
      return
    }

    if (key.constructor === Array) {
      validateKeyColumn(key, length)
      this._setKeyColumn(key)
      return
    }

    throw new Error('Invalid \'key\' option: expected Array')
  },

  _setKeyColumn (keyColumn) {
    this._data = produce(this._data, draft => {
      draft.$key = keyColumn
    })

    this._syncKeyToRowNumber()
  },

  _syncKeyToRowNumber () {
    const length = getDataLength(this._data)

    for (let i = 0; i < length; i++) {
      const key = this._data.$key[i]
      this._keyToRowNumber[key] = i
    }
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
