import { checkFormatColumnData, checkFormatInternal } from './utils/checkFormat.js'
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

    this._setupKeyColumn()

    if (options.validate === true) {
      this.validateAllColumns()
    }
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
