import produce from 'immer'

import { checkFormatColumnData, checkFormatInternal } from './utils/checkFormat.js'

import getDataLength from './utils/getDataLength.js'
import convertRowToColumnData from './utils/convertRowToColumnData.js'
import parseGeoJSON from './utils/parseGeoJSON.js'

const methods = {
  _setColumnData (data) {
    checkFormatColumnData(data)
    this._storeData(data)
  },

  _setRowData (rowData) {
    const columnData = convertRowToColumnData(rowData)
    this._setColumnData(columnData)
  },

  _setGeoJSON (geojsonData) {
    const data = parseGeoJSON(geojsonData)
    this._storeData(data)
  },

  _setTransformableDataContainer (transformableDataContainer) {
    const data = transformableDataContainer._data
    checkFormatInternal(data)
    this._storeData(data)
  },

  _setGroup (group) {
    const data = group.data
    checkFormatInternal(data)
    this._storeData(data)
  },

  _storeData (data) {
    this._data = data

    this._createKeyColumn()
    this.validateAllColumns()
  },

  _createKeyColumn () {
    const length = getDataLength(this._data)

    if (!('$key' in this._data)) {
      const keyColumn = new Array(length).fill(0).map((_, i) => i)

      this._data = produce(this._data, draft => {
        draft.$key = keyColumn
      })
    }

    for (let i = 0; i < length; i++) {
      const key = this._data.$key[i]
      this._keyToRowNumber[key] = i
    }
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
