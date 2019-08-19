import dataLoadingMixin from './dataLoadingMixin.js'
import transformationsMixin from './transformationsMixin.js'

import { isColumnOriented, isRowOriented, isGeoJSON } from './utils/checkFormat.js'
import { ensureValidRow, ensureRowExists } from './utils/ensureValidRow.js'
import { isValidColumn, ensureValidColumn, columnExists, ensureColumnExists } from './utils/isValidColumn.js'
import { calculateDomain } from './utils/calculateDomain.js'
import { getColumnType } from './utils/getDataType.js'
import getNewKey from './utils/getNewKey.js'

import { warn } from './utils/logging.js'

import { Group } from './transformations/groupBy.js'

export default class DataContainer {
  constructor (data) {
    this._data = {}
    this._length = undefined
    this._keyToRowNumber = {}

    if (isColumnOriented(data)) {
      this._setColumnData(data)
      return
    }

    if (isRowOriented(data)) {
      this._setRowData(data)
      return
    }

    if (isGeoJSON(data)) {
      this._setGeoJSON(data)
      return
    }

    if (data instanceof Group) {
      this._setGroup(data)
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

    for (let i = 0; i < this._length; i++) {
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
    const column = this.column(columnName)
    return calculateDomain(column, columnName)
  }

  type (columnName) {
    const column = this.column(columnName)
    return getColumnType(column, columnName)
  }

  // Data validation
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

  // Adding and removing rows
  addRow (row) {
    ensureValidRow(row, this)

    for (const columnName in row) {
      this._data[columnName].push(row[columnName])
    }

    const rowNumber = this._length
    const key = getNewKey(this._data.$key)

    this._data.$key.push(key)
    this._keyToRowNumber[key] = rowNumber
    this._length++
  }

  updateRow (key, row) {
    ensureRowExists(key, this)
    const rowNumber = this._keyToRowNumber[key]

    for (const columnName in row) {
      ensureColumnExists(columnName, this)

      if (columnName === '$key') {
        warn(`Cannot update '$key' of row`)
        continue
      }

      const value = row[columnName]
      this._data[columnName][rowNumber] = value
    }
  }

  deleteRow (key) {
    ensureRowExists(key, this)
    const rowNumber = this._keyToRowNumber[key]
    delete this._keyToRowNumber[key]

    for (const columnName in this._data) {
      this._data[columnName].splice(rowNumber, 1)
    }

    this._length--
  }

  // Private methods
  _row (rowNumber) {
    if (rowNumber < 0 || rowNumber >= this._length) {
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

const invalidDataError = new Error('Data passed to DataContainer is of unknown format')
