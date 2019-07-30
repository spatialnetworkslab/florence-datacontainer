import produce from 'immer'

import { checkFormatColumnData, checkFormatInternal } from './utils/checkFormat.js'

import getDataLength from './utils/getDataLength.js'
import convertRowToColumnData from './utils/convertRowToColumnData.js'
import parseGeoJSON from './utils/parseGeoJSON.js'

import id from './helpers/id.js'

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
    this._length = getDataLength(data)

    this._createIndexColumn()
    this._calculateDomainsAndTypes()
  },

  _createIndexColumn () {
    if (!this._data.hasOwnProperty('$index')) {
      const indexColumn = new Array(this._length).fill(0).map(_ => id())

      this._data = produce(this._data, draft => {
        draft.$index = indexColumn
      })
    }

    for (let i = 0; i < this._length; i++) {
      const index = this._data.$index[i]
      this._indexToRowNumber[index] = i
    }
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
