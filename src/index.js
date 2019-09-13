import dataLoadingMixin from './dataLoadingMixin.js'
import transformationsMixin from './transformationsMixin.js'
import modifyingRowsAndColumnsMixin from './modifyingRowsAndColumnsMixin.js'

import { isColumnOriented, isRowOriented, isGeoJSON } from './utils/checkFormat.js'
import { isValidColumn, ensureValidColumn, columnExists, ensureColumnExists } from './utils/isValidColumn.js'
import { calculateDomain } from './utils/calculateDomain.js'
import { getColumnType } from './utils/getDataType.js'
import getDataLength from './utils/getDataLength.js'

import { Group } from './transformations/groupBy.js'

export default class DataContainer {
  constructor (data, options = { validate: true }) {
    this._data = {}
    this._keyToRowNumber = {}
    this._domains = {}

    if (isColumnOriented(data)) {
      this._setColumnData(data, options)
      return
    }

    if (isRowOriented(data)) {
      this._setRowData(data, options)
      return
    }

    if (isGeoJSON(data)) {
      this._setGeoJSON(data, options)
      return
    }

    if (data instanceof Group) {
      this._setGroup(data, options)
      return
    }

    throw invalidDataError
  }

  // Accessing data
  data () {
    return this._data
  }

  row (key) {
    const rowNumber = this._keyToRowNumber[key]
    return this._row(rowNumber)
  }

  prevRow (key) {
    const rowNumber = this._keyToRowNumber[key]
    const previousRowNumber = rowNumber - 1
    return this._row(previousRowNumber)
  }

  nextRow (key) {
    const rowNumber = this._keyToRowNumber[key]
    const nextRowNumber = rowNumber + 1
    return this._row(nextRowNumber)
  }

  rows () {
    const rows = []
    const length = getDataLength(this._data)

    for (let i = 0; i < length; i++) {
      rows.push(this._row(i))
    }

    return rows
  }

  column (columnName) {
    ensureColumnExists(columnName, this)
    return this._data[columnName]
  }

  map (columnName, mapFunction) {
    return this.column(columnName).map(mapFunction)
  }

  domain (columnName) {
    if (columnName in this._domains) {
      return this._domains[columnName]
    }

    const column = this.column(columnName)
    const domain = calculateDomain(column, columnName)
    this._domains[columnName] = domain
    return domain
  }

  type (columnName) {
    const column = this.column(columnName)
    return getColumnType(column, columnName)
  }

  // Checks
  hasColumn (columnName) {
    return columnExists(columnName, this)
  }

  columnIsValid (columnName) {
    const column = this.column(columnName)
    return isValidColumn(column, columnName)
  }

  validateColumn (columnName) {
    const column = this.column(columnName)
    ensureValidColumn(column, columnName)
  }

  validateAllColumns () {
    for (const columnName in this._data) {
      this.validateColumn(columnName)
    }
  }

  // Private methods
  _row (rowNumber) {
    const length = getDataLength(this._data)

    if (rowNumber < 0 || rowNumber >= length) {
      return undefined
    }

    const row = {}

    for (const columnName in this._data) {
      const value = this._data[columnName][rowNumber]
      row[columnName] = value
    }

    return row
  }
}

dataLoadingMixin(DataContainer)
transformationsMixin(DataContainer)
modifyingRowsAndColumnsMixin(DataContainer)

const invalidDataError = new Error('Data passed to DataContainer is of unknown format')
