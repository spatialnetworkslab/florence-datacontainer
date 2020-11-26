import dataLoadingMixin from './dataLoadingMixin.js'
import keyMixin from './keyMixin.js'
import transformationsMixin from './transformationsMixin.js'
import modifyingRowsAndColumnsMixin from './modifyingRowsAndColumnsMixin.js'
import classificationMixin from './classificationMixin.js'

import { isColumnOriented, isRowOriented, isGeoJSON } from './utils/checkFormat.js'
import { isValidColumn, ensureValidColumn, columnExists, ensureColumnExists } from './utils/isValidColumn.js'
import { calculateDomain } from './utils/calculateDomain.js'
import { getColumnType } from './utils/getDataType.js'
import getDataLength from './utils/getDataLength.js'
import { validateJoin, getJoinColumns } from './utils/join.js'
import validateAccessorObject from './utils/validateAccessorObject.js'

import { Group } from './transformations/groupBy.js'

export default class DataContainer {
  constructor (data, options = { validate: true }) {
    this._data = {}
    this._keyToRowIndex = new Map()
    this._keyColumn = null
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

  row (accessorObject) {
    const rowIndex = this._rowIndex(accessorObject)
    return this._row(rowIndex)
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

  bbox () {
    return this.domain('$geometry')
  }

  min (columnName) {
    if (!['quantitative', 'interval'].includes(this.type(columnName))) {
      throw new Error('Column must be quantitative')
    }

    return this.domain(columnName)[0]
  }

  max (columnName) {
    if (!['quantitative', 'interval'].includes(this.type(columnName))) {
      throw new Error('Column must be quantitative')
    }

    return this.domain(columnName)[1]
  }

  type (columnName) {
    const column = this.column(columnName)
    return getColumnType(column, columnName)
  }

  columnNames () {
    return Object.keys(this._data)
  }

  nrow () {
    return getDataLength(this._data)
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

  // Join
  join (dataContainer, { by = undefined } = {}) {
    validateJoin(this, dataContainer, by)
    const joinColumns = getJoinColumns(this, dataContainer, by)

    for (const columnName in joinColumns) {
      this.addColumn(columnName, joinColumns[columnName])
    }
  }

  // Private methods
  _rowIndex (accessorObject) {
    validateAccessorObject(accessorObject)

    const rowIndex = 'key' in accessorObject
      ? this._keyToRowIndex.get(accessorObject.key)
      : accessorObject.index

    return rowIndex
  }

  _row (rowIndex) {
    const length = getDataLength(this._data)

    if (rowIndex < 0 || rowIndex >= length) {
      return undefined
    }

    const row = {}

    for (const columnName in this._data) {
      const value = this._data[columnName][rowIndex]
      row[columnName] = value
    }

    return row
  }
}

dataLoadingMixin(DataContainer)
keyMixin(DataContainer)
transformationsMixin(DataContainer)
modifyingRowsAndColumnsMixin(DataContainer)
classificationMixin(DataContainer)

const invalidDataError = new Error('Data passed to DataContainer is of unknown format')
