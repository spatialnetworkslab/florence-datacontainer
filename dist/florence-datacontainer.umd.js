(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global['florence-datacontainer'] = factory());
}(this, (function () { 'use strict';

  function isColumnOriented (data) {
    if (data.constructor === Object) {
      const columns = Object.keys(data).map(key => data[key]);
      return columns.every(column => column.constructor === Array)
    }

    return false
  }

  function isRowOriented (data) {
    if (data.constructor === Array) {
      return data.every(row => row.constructor === Object)
    }

    return false
  }

  function isGeoJSON (data) {
    const hasCorrectType = data.type === 'FeatureCollection';
    const hasCorrectFeatures = data.features && data.features.length > 0;

    return hasCorrectType && hasCorrectFeatures
  }

  function checkFormatColumnData (data) {
    checkFormat(data, { internal: false });
  }

  function checkFormatInternal (data) {
    checkFormat(data, { internal: true });
  }

  function checkFormat (data, { internal }) {
    let dataLength = null;
    const columnNameChecker = internal
      ? checkInternalDataColumnName
      : checkRegularColumnName;

    for (const columnName in data) {
      columnNameChecker(columnName);
      const column = data[columnName];

      dataLength = dataLength || column.length;

      if (internal === false && dataLength === 0) {
        throw new Error('Invalid data: columns cannot be empty')
      }

      if (dataLength !== column.length) {
        throw new Error('Invalid data: columns must be of same length')
      }
    }
  }

  function checkRegularColumnName (columnName) {
    if (columnName.match(forbiddenChars)) {
      throw new Error(`Invalid column name '${columnName}': '$' is not allowed in column names`)
    }
  }

  const forbiddenChars = /[/$]/;

  function checkInternalDataColumnName (columnName) {
    if (!['$key', '$geometry', '$grouped'].includes(columnName)) {
      checkRegularColumnName(columnName);
    }
  }

  function convertRowToColumnData (data) {
    checkIfDataIsEmpty(data);
    let columnData = initColumnData(data);

    for (let row of data) {
      for (let key in row) {
        columnData[key].push(row[key]);
      }
    }

    return columnData
  }

  function initColumnData (data) {
    let firstRow = data[0];
    let columnKeys = Object.keys(firstRow);
    let columnData = {};

    for (let key of columnKeys) {
      columnData[key] = [];
    }

    return columnData
  }

  function checkIfDataIsEmpty (data) {
    if (data.length === 0) {
      throw new Error('Received empty Array while trying to load row-oriented data. This is not allowed.')
    }
  }

  function parseGeoJSON (geojsonData) {
    const geometryData = [];
    const data = {};

    const features = geojsonData.features;
    const firstFeature = features[0];

    if ('properties' in firstFeature) {
      for (const columnName in firstFeature.properties) {
        data[columnName] = [];
      }
    }

    for (let i = 0; i < features.length; i++) {
      const { geometry, properties } = features[i];
      geometryData.push(geometry);

      for (const columnName in properties) {
        data[columnName].push(properties[columnName]);
      }
    }

    checkFormatColumnData(data);

    data.$geometry = geometryData;

    return data
  }

  const methods = {
    _setColumnData (data, options) {
      if (options.validate === false) {
        checkFormatInternal(data);
      } else {
        checkFormatColumnData(data);
      }

      this._storeData(data, options);
    },

    _setRowData (rowData, options) {
      const columnData = convertRowToColumnData(rowData);
      this._setColumnData(columnData, options);
    },

    _setGeoJSON (geojsonData, options) {
      const data = parseGeoJSON(geojsonData);
      this._storeData(data, options);
    },

    _setGroup (group, options) {
      const data = group.data;
      checkFormatInternal(data);
      this._storeData(data, options);
    },

    _storeData (data, options) {
      this._data = data;

      this._setupKeyColumn();

      if (options.validate === true) {
        this.validateAllColumns();
      }
    }
  };

  function dataLoadingMixin (targetClass) {
    Object.assign(targetClass.prototype, methods);
  }

  function generateKeyColumn (length) {
    return new Array(length).fill(0).map((_, i) => i)
  }

  function validateKeyColumn (keyColumn, requiredLength) {
    if (keyColumn.length !== requiredLength) {
      throw new Error('Key column must be of same length as rest of the data')
    }

    ensureUnique(keyColumn);
  }

  function ensureUnique (keyColumn) {
    if (keyColumn.length !== new Set(keyColumn).size) {
      throw new Error('Keys must be unique')
    }
  }

  function getDataLength (data) {
    const keys = Object.keys(data);

    const firstKey = keys[0] === '$key'
      ? keys[1]
      : keys[0];

    const firstColumn = data[firstKey];
    return firstColumn.length
  }

  const methods$1 = {
    keys () {
      return this.column('$key')
    },

    setKey (columnName) {
      this._keyColumn = columnName;
      this._keyToRowIndex.clear();

      const column = this.column(columnName);
      const length = getDataLength(this._data);
      validateKeyColumn(column, length);

      this._setKeyColumn(column);
    },

    resetKey () {
      this._keyToRowIndex.clear();
      this._keyColumn = null;
      delete this._data.$key;

      this._setupKeyColumn();
    },

    _setupKeyColumn () {
      const length = getDataLength(this._data);

      if ('$key' in this._data) {
        validateKeyColumn(this._data.$key, length);
        this._constructKeyToRowIndex();
      } else {
        const keyColumn = generateKeyColumn(length);
        this._setKeyColumn(keyColumn);
      }
    },

    _setKeyColumn (keyColumn) {
      this._data.$key = keyColumn;
      this._constructKeyToRowIndex();
    },

    _constructKeyToRowIndex () {
      const length = getDataLength(this._data);

      for (let i = 0; i < length; i++) {
        const key = this._data.$key[i];
        this._keyToRowIndex.set(key, i);
      }
    }
  };

  function keyMixin (targetClass) {
    Object.assign(targetClass.prototype, methods$1);
  }

  function filter (data, filterFunction) {
    const length = getDataLength(data);
    const newData = {};
    for (const colName in data) { newData[colName] = []; }

    for (let i = 0; i < length; i++) {
      const row = {};
      for (const colName in data) { row[colName] = data[colName][i]; }

      if (filterFunction(row, i) === true) {
        for (const colName in row) { newData[colName].push(row[colName]); }
      }
    }

    return newData
  }

  function select (data, selection) {
    if (selection.constructor === String) {
      selection = [selection];
    }

    if (selection.constructor === Array) {
      validateSelectionInstructions(data, selection);

      const newData = {};

      for (const columnName of selection) {
        newData[columnName] = data[columnName];
      }

      return newData
    } else {
      throw new Error('select can only be used with a string or array of strings')
    }
  }

  function validateSelectionInstructions (data, selection) {
    for (const columnName of selection) {
      if (!(columnName in data)) {
        throw new Error(`Column '${columnName}' not found`)
      }
    }
  }

  // This function comes from Turf's wonderful geospatial lib
  // We only need this single function and importing it from @turf/meta
  // doesn't work well for in-browser compilation
  // https://github.com/Turfjs/turf

  // The MIT License (MIT)

  // Copyright (c) 2019 Morgan Herlocker

  // Permission is hereby granted, free of charge, to any person obtaining a copy of
  // this software and associated documentation files (the "Software"), to deal in
  // the Software without restriction, including without limitation the rights to
  // use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
  // the Software, and to permit persons to whom the Software is furnished to do so,
  // subject to the following conditions:

  // The above copyright notice and this permission notice shall be included in all
  // copies or substantial portions of the Software.

  // THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  // IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
  // FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
  // COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
  // IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  // CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

  function coordEach (geojson, callback, excludeWrapCoord) {
    // Handles null Geometry -- Skips this GeoJSON
    if (geojson === null) return
    var j; var k; var l; var geometry; var stopG; var coords;
    var geometryMaybeCollection;
    var wrapShrink = 0;
    var coordIndex = 0;
    var isGeometryCollection;
    var type = geojson.type;
    var isFeatureCollection = type === 'FeatureCollection';
    var isFeature = type === 'Feature';
    var stop = isFeatureCollection ? geojson.features.length : 1;

    // This logic may look a little weird. The reason why it is that way
    // is because it's trying to be fast. GeoJSON supports multiple kinds
    // of objects at its root: FeatureCollection, Features, Geometries.
    // This function has the responsibility of handling all of them, and that
    // means that some of the `for` loops you see below actually just don't apply
    // to certain inputs. For instance, if you give this just a
    // Point geometry, then both loops are short-circuited and all we do
    // is gradually rename the input until it's called 'geometry'.
    //
    // This also aims to allocate as few resources as possible: just a
    // few numbers and booleans, rather than any temporary arrays as would
    // be required with the normalization approach.
    for (var featureIndex = 0; featureIndex < stop; featureIndex++) {
      geometryMaybeCollection = (isFeatureCollection ? geojson.features[featureIndex].geometry
        : (isFeature ? geojson.geometry : geojson));
      isGeometryCollection = (geometryMaybeCollection) ? geometryMaybeCollection.type === 'GeometryCollection' : false;
      stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

      for (var geomIndex = 0; geomIndex < stopG; geomIndex++) {
        var multiFeatureIndex = 0;
        var geometryIndex = 0;
        geometry = isGeometryCollection
          ? geometryMaybeCollection.geometries[geomIndex] : geometryMaybeCollection;

        // Handles null Geometry -- Skips this geometry
        if (geometry === null) continue
        coords = geometry.coordinates;
        var geomType = geometry.type;

        wrapShrink = (excludeWrapCoord && (geomType === 'Polygon' || geomType === 'MultiPolygon')) ? 1 : 0;

        switch (geomType) {
          case null:
            break
          case 'Point':
            if (callback(coords, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false
            coordIndex++;
            multiFeatureIndex++;
            break
          case 'LineString':
          case 'MultiPoint':
            for (j = 0; j < coords.length; j++) {
              if (callback(coords[j], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false
              coordIndex++;
              if (geomType === 'MultiPoint') multiFeatureIndex++;
            }
            if (geomType === 'LineString') multiFeatureIndex++;
            break
          case 'Polygon':
          case 'MultiLineString':
            for (j = 0; j < coords.length; j++) {
              for (k = 0; k < coords[j].length - wrapShrink; k++) {
                if (callback(coords[j][k], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false
                coordIndex++;
              }
              if (geomType === 'MultiLineString') multiFeatureIndex++;
              if (geomType === 'Polygon') geometryIndex++;
            }
            if (geomType === 'Polygon') multiFeatureIndex++;
            break
          case 'MultiPolygon':
            for (j = 0; j < coords.length; j++) {
              geometryIndex = 0;
              for (k = 0; k < coords[j].length; k++) {
                for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
                  if (callback(coords[j][k][l], coordIndex, featureIndex, multiFeatureIndex, geometryIndex) === false) return false
                  coordIndex++;
                }
                geometryIndex++;
              }
              multiFeatureIndex++;
            }
            break
          case 'GeometryCollection':
            for (j = 0; j < geometry.geometries.length; j++) { if (coordEach(geometry.geometries[j], callback, excludeWrapCoord) === false) return false }
            break
          default:
            throw new Error('Unknown Geometry Type')
        }
      }
    }
  }

  function calculateBBoxGeometries (geometries) {
    let bbox = { x: [Infinity, -Infinity], y: [Infinity, -Infinity] };

    for (let i = 0; i < geometries.length; i++) {
      bbox = updateBBox(bbox, geometries[i]);
    }

    return bbox
  }

  function updateBBox ({ x, y }, geometry) {
    coordEach(geometry, coord => {
      x[0] = Math.min(coord[0], x[0]);
      x[1] = Math.max(coord[0], x[1]);
      y[0] = Math.min(coord[1], y[0]);
      y[1] = Math.max(coord[1], y[1]);
    });

    return { x, y }
  }

  function isInvalid (value) {
    if (value === undefined || value === null) { return true }

    if (value.constructor === Number) {
      return !isFinite(value)
    }

    return false
  }

  function isDefined (value) {
    return value !== undefined
  }

  function isUndefined (value) {
    return value === undefined
  }

  function warn (message) {
    if (!process) console.warn(message);

    if (process && process.env.NODE_ENV !== 'test') {
      console.warn(message);
    }
  }

  function calculateDomain (column, columnName) {
    if (columnName === '$grouped') {
      throw new Error(`Cannot calculate domain of column '${columnName}'.`)
    }

    if (column.length === 0) {
      return createEmptyDomain(columnName)
    }

    const { firstValidValue, nValidValues } = findFirstValidValue(column);

    if (nValidValues === 0) {
      throw new Error(`Cannot calculate domain of column '${column}'. Column contains only missing values.`)
    }

    if (nValidValues > 0) {
      ensureValidDataType(firstValidValue);
      const type = getDataType(firstValidValue);

      if (columnName === '$geometry') {
        return calculateBBoxGeometries(column)
      }

      if (columnName !== '$geometry') {
        return calculateNonGeometryColumnDomain(column, columnName, nValidValues, firstValidValue, type)
      }
    }
  }

  function createEmptyDomain (columnName) {
    if (columnName === '$geometry') {
      return { x: [], y: [] }
    }

    if (columnName !== '$geometry') {
      return []
    }
  }

  function findFirstValidValue (column) {
    let firstValidValue;
    let nValidValues = 0;

    for (let i = 0; i < column.length; i++) {
      if (!isInvalid(column[i])) {
        nValidValues++;
        firstValidValue = firstValidValue || column[i];
      }

      if (nValidValues > 1) break
    }

    return { firstValidValue, nValidValues }
  }

  function calculateNonGeometryColumnDomain (column, columnName, nValidValues, firstValidValue, type) {
    let domain;
    const nUniqueValues = calculateNumberOfUniqueValues(column, type);

    if (columnHasOnlyOneUniqueValue(nValidValues, nUniqueValues)) {
      domain = calculateDomainForColumnWithOneUniqueValue(
        nValidValues, nUniqueValues, type, firstValidValue, columnName
      );
    } else {
      domain = calculateDomainForRegularColumn(type, column, columnName);
    }

    return domain
  }

  function calculateNumberOfUniqueValues (col, type) {
    const uniqueVals = {};

    if (['quantitative', 'categorical'].includes(type)) {
      for (let i = 0; i < col.length; i++) {
        const val = col[i];
        if (!isInvalid(val)) {
          uniqueVals[val] = 0;
        }
      }
    }

    if (type === 'temporal') {
      for (let i = 0; i < col.length; i++) {
        const val = col[i];
        if (!isInvalid(val)) {
          uniqueVals[val.getTime()] = 0;
        }
      }
    }

    if (type === 'interval') {
      for (let i = 0; i < col.length; i++) {
        const val = col[i];
        if (!isInvalid(val)) {
          const str = JSON.stringify(val);
          uniqueVals[str] = 0;
        }
      }
    }

    return Object.keys(uniqueVals).length
  }

  function columnHasOnlyOneUniqueValue (nValidValues, nUniqueValues) {
    return nValidValues === 1 || nUniqueValues === 1
  }

  function calculateDomainForColumnWithOneUniqueValue (nValidValues, nUniqueValues, type, firstValidValue, columnName) {
    const domain = createDomainForSingleValue(type, firstValidValue);
    const warningText = nValidValues === 1 ? 'valid' : 'unique';

    if (type !== 'categorical') {
      warn(
        `Column '${columnName}' contains only 1 ${warningText} value: ${firstValidValue}.\n` +
        `Using domain ${JSON.stringify(domain)}`
      );
    }

    return domain
  }

  function calculateDomainForRegularColumn (type, column, columnName) {
    let domain = initDomain(type);

    for (let i = 0; i < column.length; i++) {
      const value = column[i];

      if (!isInvalid(value)) {
        if (getDataType(value) !== type) {
          throw new Error(`Invalid column ${columnName}: column contains multiple data types`)
        }

        domain = updateDomain(domain, value, type);
      }
    }

    return domain
  }

  const minUnixTime = new Date(0);
  const maxUnixTime = new Date('19 January 2038');

  function initDomain (type) {
    let domain;
    switch (type) {
      case 'quantitative': {
        domain = [Infinity, -Infinity];
        break
      }
      case 'categorical': {
        domain = [];
        break
      }
      case 'temporal': {
        domain = [maxUnixTime, minUnixTime];
        break
      }
      case 'interval': {
        domain = [Infinity, -Infinity];
        break
      }
    }

    return domain
  }

  function updateDomain (domain, value, type) {
    if (!['quantitative', 'categorical', 'temporal', 'interval'].includes(type)) {
      throw new Error(`Cannot set domain for column of type '${type}'`)
    }

    if (type === 'quantitative') {
      if (domain[0] >= value) { domain[0] = value; }
      if (domain[1] <= value) { domain[1] = value; }
    }

    if (type === 'categorical') {
      if (!domain.includes(value)) { domain.push(value); }
    }

    if (type === 'temporal') {
      const epoch = value.getTime();

      if (domain[0].getTime() >= epoch) { domain[0] = value; }
      if (domain[1].getTime() <= epoch) { domain[1] = value; }
    }

    if (type === 'interval') {
      domain = updateDomain(domain, value[0], 'quantitative');
      domain = updateDomain(domain, value[1], 'quantitative');
    }

    return domain
  }

  function createDomainForSingleValue (type, value) {
    let domain;

    if (type === 'quantitative') {
      domain = [value - 1, value + 1];
    }

    if (type === 'categorical') {
      domain = [value];
    }

    if (type === 'temporal') {
      domain = [getDay(value, -1), getDay(value, 1)];
    }

    if (type === 'interval') {
      domain = value.sort((a, b) => a - b);
    }

    return domain
  }

  function getDay (date, days) {
    const dateCopy = new Date(date.getTime());
    return new Date(dateCopy.setDate(dateCopy.getDate() + days))
  }

  function getColumnType (column) {
    const { firstValidValue } = findFirstValidValue(column);
    return getDataType(firstValidValue)
  }

  function getDataType (value) {
    if (isInvalid(value)) return undefined

    if (value.constructor === Number) return 'quantitative'
    if (value.constructor === String) return 'categorical'
    if (value.constructor === Date) return 'temporal'
    if (isInterval(value)) return 'interval'
    if (isGeometry(value)) return 'geometry'
    if (value.constructor === DataContainer) return 'grouped'

    return undefined
  }

  function ensureValidDataType (value) {
    if (isInvalid(getDataType(value))) {
      throw new Error('Invalid data')
    }
  }

  function isGeometry (value) {
    return value.constructor === Object && 'type' in value && 'coordinates' in value
  }

  function isInterval (value) {
    return value.constructor === Array && value.length === 2 && value.every(entry => entry.constructor === Number)
  }

  function arrange (data, sortInstructions) {
    if (sortInstructions.constructor === Object) {
      return sort(data, sortInstructions)
    } else if (sortInstructions.constructor === Array) {
      let newData;

      for (let i = sortInstructions.length - 1; i >= 0; i--) {
        const instruction = sortInstructions[i];

        newData = sort(
          newData ? data : newData,
          instruction
        );
      }

      return newData
    } else {
      throw new Error('arrange requires a key-value object or array of key-value objects')
    }
  }

  const sortFuncs = {
    quantitative: {
      // https://beta.observablehq.com/@mbostock/manipulating-flat-arrays
      ascending: (a, b) => a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN,
      descending: (a, b) => b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN
    },
    categorical: {
      ascending: (a, b) => {
        const sorted = [a, b].sort();
        return sorted[0] === a ? -1 : 1
      },
      descending: (a, b) => {
        const sorted = [a, b].sort();
        return sorted[0] === a ? 1 : -1
      }
    },
    temporal: {
      ascending: (a, b) => {
        return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN
      },
      descending: (a, b) => {
        return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN
      }
    }
  };

  function sort (data, sortInstructions) {
    if (Object.keys(sortInstructions).length !== 1) {
      throw new Error('Only one key-value pair allowed')
    }

    const variable = Object.keys(sortInstructions)[0];
    const sortMethod = sortInstructions[variable];

    ensureValidDataType(data[variable][0]);
    const dataType = getDataType(data[variable][0]);

    let sortFunc;
    if (sortMethod.constructor === String) {
      sortFunc = sortFuncs[dataType][sortMethod];
    }
    if (sortMethod.constructor === Function) {
      sortFunc = sortMethod;
    }

    const column = data[variable];

    const indices = column.map((v, i) => i);
    const sortedIndices = indices.sort((a, b) => sortFunc(column[a], column[b]));

    const newData = {};

    for (const colName in data) {
      newData[colName] = reorder(data[colName], sortedIndices);
    }

    return newData
  }

  function reorder (column, indices) {
    return indices.map(i => column[i])
  }

  function rename (data, renameInstructions) {
    if (renameInstructions.constructor !== Object) {
      throw new Error('Rename only accepts an object')
    }

    const newData = Object.assign({}, data);

    for (const oldName in renameInstructions) {
      if (oldName in data) {
        const newName = renameInstructions[oldName];
        checkRegularColumnName(newName);

        newData[newName] = newData[oldName];
        delete newData[oldName];
      } else {
        warn(`Rename: column '${oldName}' not found`);
      }
    }

    return newData
  }

  function mutate (data, mutateInstructions) {
    const length = getDataLength(data);
    const newData = initNewData(data, mutateInstructions);

    for (let i = 0; i < length; i++) {
      const row = {};

      for (const columnName in data) {
        row[columnName] = data[columnName][i];
      }

      for (const columnName in mutateInstructions) {
        const mutateFunction = mutateInstructions[columnName];
        newData[columnName][i] = mutateFunction(row, i);
      }
    }

    return newData
  }

  function transmute (data, transmuteInstructions) {
    const newData = mutate(data, transmuteInstructions);

    for (const columnName in newData) {
      if (!(columnName in transmuteInstructions)) {
        delete newData[columnName];
      }
    }

    return newData
  }

  function initNewData (data, mutateInstructions) {
    const length = getDataLength(data);
    const newData = Object.assign({}, data);

    const dataColumns = new Set(Object.keys(data));
    const mutateColumns = new Set(Object.keys(mutateInstructions));

    for (const columnName of mutateColumns) {
      if (!dataColumns.has(columnName)) {
        newData[columnName] = new Array(length).fill(undefined);
      }
    }

    return newData
  }

  var aggregations = {
    count,
    sum,
    mean,
    median,
    mode,
    min,
    max
  };

  function count (column) {
    return column.length
  }

  function sum (column) {
    let total = 0;
    for (const value of column) {
      total += value;
    }

    return total
  }

  function mean (column) {
    return sum(column) / count(column)
  }

  function median (column) {
    const asc = column.sort((a, b) => a > b);
    const len = count(column);

    if (len % 2 === 1) {
      // Odd
      return asc[Math.floor(len / 2)]
    } else {
      // Even
      const lower = asc[(len / 2) - 1];
      const upper = asc[(len / 2)];
      return (lower + upper) / 2
    }
  }

  function mode (column) {
    const counts = {};

    for (const value of column) {
      if (value in counts) {
        counts[value]++;
      } else {
        counts[value] = 1;
      }
    }

    let winner;
    let winningVal = 0;

    for (const value in counts) {
      if (counts[value] > winningVal) {
        winningVal = counts[value];
        winner = value;
      }
    }

    return winner
  }

  function min (column) {
    let winner = Infinity;
    for (const value of column) {
      if (value < winner) { winner = value; }
    }
    return winner
  }

  function max (column) {
    let winner = -Infinity;
    for (const value of column) {
      if (value > winner) { winner = value; }
    }
    return winner
  }

  function checkKeyValuePair (obj, allowedKeys) {
    const keys = Object.keys(obj);
    if (keys.length !== 1) {
      throw new Error('Invalid transformation syntax')
    }

    const key = keys[0];

    if (!allowedKeys.includes(key)) {
      throw new Error(`Unknown column ${key}`)
    }

    return key
  }

  function summarise (data, summariseInstructions) {
    if (summariseInstructions.constructor !== Object) {
      throw new Error('summarise must be an object')
    }

    let newData = initNewData$1(summariseInstructions, data);

    if ('$grouped' in data) {
      checkSummariseInstructions(summariseInstructions, data);

      for (const columnName in data) {
        if (columnName !== '$grouped') {
          newData[columnName] = data[columnName];
        }
      }

      for (const group of data.$grouped) {
        const data = group.data();
        newData = summariseGroup(data, summariseInstructions, newData);
      }
    } else {
      newData = summariseGroup(data, summariseInstructions, newData);
    }
    return newData
  }

  function initNewData$1 (summariseInstructions, data) {
    const newData = {};
    for (const newCol in summariseInstructions) { newData[newCol] = []; }
    if (data && '$grouped' in data) {
      for (const col in data) {
        if (col !== '$grouped') {
          newData[col] = [];
        }
      }
    }
    return newData
  }

  function summariseGroup (data, summariseInstructions, newData) {
    for (const newColName in summariseInstructions) {
      const instruction = summariseInstructions[newColName];

      if (instruction.constructor === Object) {
        const column = checkKeyValuePair(instruction, Object.keys(data));
        const aggregation = instruction[column];

        if (aggregation.constructor === String) {
          if (!(aggregation in aggregations)) {
            throw new Error(`Unkown summaryMethod: '${aggregation}'.`)
          }

          newData[newColName].push(aggregations[aggregation](data[column]));
        } else if (aggregation.constructor === Function) {
          newData[newColName].push(aggregation(data[column]));
        } else {
          throw new Error(`Invalid summaryMethod: '${aggregation}'. Must be String or Function`)
        }
      }
    }

    return newData
  }

  function checkSummariseInstructions (summariseInstructions, data) {
    for (const newColName in summariseInstructions) {
      const instruction = summariseInstructions[newColName];
      const name = Object.keys(instruction)[0];

      checkRegularColumnName(name);

      if (name in data) {
        throw new Error(`Cannot summarise the column '${name}': used for grouping`)
      }
    }
  }

  function mutarise (data, mutariseInstructions) {
    if (mutariseInstructions.constructor !== Object) {
      throw new Error('mutarise must be an object')
    }

    let newCols = initNewData$1(mutariseInstructions);

    if ('$grouped' in data) {
      checkSummariseInstructions(mutariseInstructions, data);

      for (const group of data.$grouped) {
        let summarizedData = initNewData$1(mutariseInstructions);
        const dataInGroup = group.data();
        summarizedData = summariseGroup(dataInGroup, mutariseInstructions, summarizedData);

        const length = getDataLength(dataInGroup);
        newCols = addGroupSummaries(newCols, summarizedData, length);
      }

      data = ungroup(data);
    } else {
      let summarizedData = initNewData$1(mutariseInstructions);
      summarizedData = summariseGroup(data, mutariseInstructions, summarizedData);

      const length = getDataLength(data);
      newCols = addGroupSummaries(newCols, summarizedData, length);
    }

    return join(data, newCols)
  }

  function addGroupSummaries (newCols, summarizedData, length) {
    for (let i = 0; i < length; i++) {
      for (const key in summarizedData) {
        newCols[key].push(summarizedData[key][0]);
      }
    }

    return newCols
  }

  function ungroup (data) {
    const newData = initNewData$1(data.$grouped[0].data());

    for (const group of data.$grouped) {
      const groupData = group.data();
      for (const col in newData) {
        newData[col].push(...groupData[col]);
      }
    }

    return newData
  }

  function join (data, newCols) {
    for (const col in newCols) {
      data[col] = newCols[col];
    }

    return data
  }

  function groupBy (data, groupByInstructions) {
    const groupedData = {};

    const groupedColumns = getGroupedColumns(data, groupByInstructions);
    const groups = groupBy$1(data, groupedColumns);

    groupedData.$grouped = groups.map(group => new DataContainer(group));
    for (const col of groupedColumns) {
      groupedData[col] = [];
    }

    for (let i = 0; i < groupedColumns.length; i++) {
      const col = groupedColumns[i];

      for (const group of groups) {
        groupedData[col].push(group.groupedValues[i]);
      }
    }

    return groupedData
  }

  function getGroupedColumns (data, groupByInstructions) {
    const con = groupByInstructions.constructor;
    if (![String, Array].includes(con)) {
      throw new Error('groupBy can only be used with a string or array of strings')
    }

    const groupedColumns = con === String ? [groupByInstructions] : groupByInstructions;

    for (const col of groupedColumns) {
      if (!(col in data)) {
        throw new Error(`Column '${col}' not found`)
      }
    }

    if (groupedColumns.length === Object.keys(data).length) {
      throw new Error('Cannot group by all columns')
    }

    return groupedColumns
  }

  function getGroupedValues (data, i, columns) {
    const groupedValues = [];
    for (const col of columns) {
      groupedValues.push(data[col][i]);
    }

    return groupedValues
  }

  function groupBy$1 (data, groupedColumns) {
    const groups = {};

    const length = getDataLength(data);

    for (let i = 0; i < length; i++) {
      // Ge grouped values
      const groupedValues = getGroupedValues(data, i, groupedColumns);

      // Get unique identifier for group
      const groupID = JSON.stringify(groupedValues);

      // If groups object has no entry for this group yet: create new group object
      groups[groupID] = groups[groupID] || new Group(data, groupedValues);

      // Add row to group
      groups[groupID].addRow(data, i);
    }

    // Convert groups object to array
    return Object.keys(groups).map(group => {
      return groups[group]
    })
  }

  class Group {
    constructor (data, groupedValues) {
      this.data = {};
      this.groupedValues = groupedValues;

      for (const col in data) {
        this.data[col] = [];
      }
    }

    addRow (data, i) {
      for (const col in data) {
        this.data[col].push(data[col][i]);
      }
    }
  }

  /**
   * Classify the series in equal intervals from minimum to maximum value.
   * @param {array} serie
   * @param {number} nbClass
   * @param {number} forceMin
   * @param {number} forceMax
   */
  const classifyEqInterval = (serie, nbClass, forceMin, forceMax) => {
    if (serie.length === 0) {
      return []
    }

    const tmpMin = typeof forceMin === 'undefined' ? Math.min(...serie) : forceMin;
    const tmpMax = typeof forceMax === 'undefined' ? Math.max(...serie) : forceMax;

    const bounds = [];
    const interval = (tmpMax - tmpMin) / nbClass;
    let val = tmpMin;

    for (let i = 0; i <= nbClass; i++) {
      bounds.push(val);
      val += interval;
    }

    bounds[nbClass] = tmpMax;

    return bounds
  };

  /**
   * Based on jenks implementation of geostats
   * https://github.com/simogeo/geostats
   * https://raw.githubusercontent.com/simogeo/geostats/a5b2b89a7bef3c412468bb1062e3cf00ffdae0ea/lib/geostats.js
   */
  const classifyJenks = (serie, nbClass) => {
    if (serie.length === 0) {
      return []
    }

    serie.sort((a, b) => a - b);

    // define two matrices mat1, mat2
    const height = serie.length + 1;
    const width = nbClass + 1;
    const mat1 = Array(height)
      .fill()
      .map(() => Array(width).fill(0));
    const mat2 = Array(height)
      .fill()
      .map(() => Array(width).fill(0));

    // initialize mat1, mat2
    for (let y = 1; y < nbClass + 1; y++) {
      mat1[0][y] = 1;
      mat2[0][y] = 0;
      for (let t = 1; t < serie.length + 1; t++) {
        mat2[t][y] = Infinity;
      }
    }

    // fill matrices
    for (let l = 2; l < serie.length + 1; l++) {
      let s1 = 0.0;
      let s2 = 0.0;
      let w = 0.0;
      let v = 0.0;
      for (let m = 1; m < l + 1; m++) {
        const i3 = l - m + 1;
        const val = parseFloat(serie[i3 - 1]);
        s2 += val * val;
        s1 += val;
        w += 1;
        v = s2 - (s1 * s1) / w;
        const i4 = i3 - 1;
        if (i4 !== 0) {
          for (let p = 2; p < nbClass + 1; p++) {
            if (mat2[l][p] >= v + mat2[i4][p - 1]) {
              mat1[l][p] = i3;
              mat2[l][p] = v + mat2[i4][p - 1];
            }
          }
        }
      }
      mat1[l][1] = 1;
      mat2[l][1] = v;
    }

    const bounds = [];
    bounds.push(serie[serie.length - 1]);
    let k = serie.length;
    for (let i = nbClass; i >= 2; i--) {
      const idx = parseInt(mat1[k][i] - 2);
      bounds.push(serie[idx]);
      k = parseInt(mat1[k][i] - 1);
    }
    bounds.push(serie[0]);

    return bounds.reverse()
  };

  const classifyQuantile = (serie, nbClass) => {
    if (serie.length === 0) {
      return []
    }

    serie.sort((a, b) => a - b);
    const bounds = [];

    bounds.push(serie[0]);
    const step = serie.length / nbClass;
    for (let i = 1; i < nbClass; i++) {
      const qidx = Math.round(i * step + 0.49);
      bounds.push(serie[qidx - 1]);
    }
    bounds.push(serie[serie.length - 1]);

    return bounds
  };

  const mean$1 = (serie) => {
    const sum = serie.reduce((sum, val) => sum + val, 0);
    return sum / serie.length
  };

  const variance = (serie) => {
    let tmp = 0;
    for (let i = 0; i < serie.length; i++) {
      tmp += Math.pow(serie[i] - mean$1(serie), 2);
    }
    return tmp / serie.length
  };

  const stddev = (serie) => {
    return Math.sqrt(variance(serie))
  };

  const classifyStdDeviation = (serie, nbClass) => {
    if (serie.length === 0) {
      return []
    }

    const _mean = mean$1(serie);
    const _stddev = stddev(serie);

    const bounds = [];

    // number of classes is odd
    if (nbClass % 2 === 1) {
      // Euclidean division to get the inferior bound
      const infBound = Math.floor(nbClass / 2);
      const supBound = infBound + 1;
      // we set the central bounds
      bounds[infBound] = _mean - _stddev / 2;
      bounds[supBound] = _mean + _stddev / 2;
      // Values < to infBound, except first one
      for (let i = infBound - 1; i > 0; i--) {
        const val = bounds[i + 1] - _stddev;
        bounds[i] = val;
      }
      // Values > to supBound, except last one
      for (let i = supBound + 1; i < nbClass; i++) {
        const val = bounds[i - 1] + _stddev;
        bounds[i] = val;
      }

      // number of classes is even
    } else {
      const meanBound = nbClass / 2;
      // we get the mean value
      bounds[meanBound] = _mean;
      // Values < to the mean, except first one
      for (let i = meanBound - 1; i > 0; i--) {
        const val = bounds[i + 1] - _stddev;
        bounds[i] = val;
      }
      // Values > to the mean, except last one
      for (let i = meanBound + 1; i < nbClass; i++) {
        const val = bounds[i - 1] + _stddev;
        bounds[i] = val;
      }
    }
    // set first value
    bounds[0] = Math.min(...serie);
    // set last value
    bounds[nbClass] = Math.max(...serie);

    return bounds
  };

  const numericSort = arr => arr.slice().sort((a, b) => a - b);
  const uniqueCountSorted = arr => new Set(arr).size;

  /**
   * Based on https://github.com/simple-statistics/simple-statistics/blob/master/src/ckmeans.js

   * Ckmeans clustering is an improvement on heuristic-based clustering
   * approaches like Jenks. The algorithm was developed in
   * [Haizhou Wang and Mingzhou Song](http://journal.r-project.org/archive/2011-2/RJournal_2011-2_Wang+Song.pdf)
   * as a [dynamic programming](https://en.wikipedia.org/wiki/Dynamic_programming) approach
   * to the problem of clustering numeric data into groups with the least
   * within-group sum-of-squared-deviations.
   *
   * Minimizing the difference within groups - what Wang & Song refer to as
   * `withinss`, or within sum-of-squares, means that groups are optimally
   * homogenous within and the data is split into representative groups.
   * This is very useful for visualization, where you may want to represent
   * a continuous variable in discrete color or style groups. This function
   * can provide groups that emphasize differences between data.
   *
   * Being a dynamic approach, this algorithm is based on two matrices that
   * store incrementally-computed values for squared deviations and backtracking
   * indexes.
   *
   * This implementation is based on Ckmeans 3.4.6, which introduced a new divide
   * and conquer approach that improved runtime from O(kn^2) to O(kn log(n)).
   *
   * Unlike the [original implementation](https://cran.r-project.org/web/packages/Ckmeans.1d.dp/index.html),
   * this implementation does not include any code to automatically determine
   * the optimal number of clusters: this information needs to be explicitly
   * provided.
   *
   * ### References
   * _Ckmeans.1d.dp: Optimal k-means Clustering in One Dimension by Dynamic
   * Programming_ Haizhou Wang and Mingzhou Song ISSN 2073-4859
   *
   * from The R Journal Vol. 3/2, December 2011
   * @param {Array<number>} x input data, as an array of number values
   * @param {number} nClusters number of desired classes. This cannot be
   * greater than the number of values in the data array.
   * @returns {Array<Array<number>>} clustered input
   * @throws {Error} if the number of requested clusters is higher than the size of the data
   * @example
   * ckmeans([-1, 2, -1, 2, 4, 5, 6, -1, 2, -1], 3);
   * // The input, clustered into groups of similar numbers.
   * //= [[-1, -1, -1, -1], [2, 2, 2], [4, 5, 6]]);
   */
  function classifyCkmeans(x, nClusters) {
    if (nClusters > x.length) {
      return []
    }

    const sorted = numericSort(x);
    // we'll use this as the maximum number of clusters
    const uniqueCount = uniqueCountSorted(sorted);

    // if all of the input values are identical, there's one cluster
    // with all of the input in it.
    if (uniqueCount === 1) {
      return [sorted]
    }

    // named 'S' originally
    const matrix = makeMatrix(nClusters, sorted.length);
    // named 'J' originally
    const backtrackMatrix = makeMatrix(nClusters, sorted.length);

    // This is a dynamic programming way to solve the problem of minimizing
    // within-cluster sum of squares. It's similar to linear regression
    // in this way, and this calculation incrementally computes the
    // sum of squares that are later read.
    fillMatrices(sorted, matrix, backtrackMatrix);

    // The real work of Ckmeans clustering happens in the matrix generation:
    // the generated matrices encode all possible clustering combinations, and
    // once they're generated we can solve for the best clustering groups
    // very quickly.
    const clusters = [];
    let clusterRight = backtrackMatrix[0].length - 1;

    // Backtrack the clusters from the dynamic programming matrix. This
    // starts at the bottom-right corner of the matrix (if the top-left is 0, 0),
    // and moves the cluster target with the loop.
    for (let cluster = backtrackMatrix.length - 1; cluster >= 0; cluster--) {
      const clusterLeft = backtrackMatrix[cluster][clusterRight];

      // fill the cluster from the sorted input by taking a slice of the
      // array. the backtrack matrix makes this easy - it stores the
      // indexes where the cluster should start and end.
      clusters[cluster] = sorted.slice(clusterLeft, clusterRight + 1);

      if (cluster > 0) {
        clusterRight = clusterLeft - 1;
      }
    }

    const bounds = [];
    bounds.push(clusters[0][0]);
    for (const cluster of clusters) {
      bounds.push(cluster[cluster.length - 1]);
    }

    return bounds
  }
  /**
   * Create a new column x row matrix.
   *
   * @private
   * @param {number} columns
   * @param {number} rows
   * @return {Array<Array<number>>} matrix
   * @example
   * makeMatrix(10, 10);
   */
  function makeMatrix(columns, rows) {
    const matrix = [];
    for (let i = 0; i < columns; i++) {
      const column = [];
      for (let j = 0; j < rows; j++) {
        column.push(0);
      }
      matrix.push(column);
    }
    return matrix
  }

  /**
   * Generates incrementally computed values based on the sums and sums of
   * squares for the data array
   *
   * @private
   * @param {number} j
   * @param {number} i
   * @param {Array<number>} sums
   * @param {Array<number>} sumsOfSquares
   * @return {number}
   * @example
   * ssq(0, 1, [-1, 0, 2], [1, 1, 5]);
   */
  function ssq(j, i, sums, sumsOfSquares) {
    let sji; // s(j, i)
    if (j > 0) {
      const muji = (sums[i] - sums[j - 1]) / (i - j + 1); // mu(j, i)
      sji = sumsOfSquares[i] - sumsOfSquares[j - 1] - (i - j + 1) * muji * muji;
    } else {
      sji = sumsOfSquares[i] - (sums[i] * sums[i]) / (i + 1);
    }
    if (sji < 0) {
      return 0
    }
    return sji
  }

  /**
   * Function that recursively divides and conquers computations
   * for cluster j
   *
   * @private
   * @param {number} iMin Minimum index in cluster to be computed
   * @param {number} iMax Maximum index in cluster to be computed
   * @param {number} cluster Index of the cluster currently being computed
   * @param {Array<Array<number>>} matrix
   * @param {Array<Array<number>>} backtrackMatrix
   * @param {Array<number>} sums
   * @param {Array<number>} sumsOfSquares
   */
  function fillMatrixColumn(
    iMin,
    iMax,
    cluster,
    matrix,
    backtrackMatrix,
    sums,
    sumsOfSquares
  ) {
    if (iMin > iMax) {
      return
    }

    // Start at midpoint between iMin and iMax
    const i = Math.floor((iMin + iMax) / 2);

    matrix[cluster][i] = matrix[cluster - 1][i - 1];
    backtrackMatrix[cluster][i] = i;

    let jlow = cluster; // the lower end for j

    if (iMin > cluster) {
      jlow = Math.max(jlow, backtrackMatrix[cluster][iMin - 1] || 0);
    }
    jlow = Math.max(jlow, backtrackMatrix[cluster - 1][i] || 0);

    let jhigh = i - 1; // the upper end for j
    if (iMax < matrix.length - 1) {
      jhigh = Math.min(jhigh, backtrackMatrix[cluster][iMax + 1] || 0);
    }

    let sji;
    let sjlowi;
    let ssqjlow;
    let ssqj;
    for (let j = jhigh; j >= jlow; --j) {
      sji = ssq(j, i, sums, sumsOfSquares);

      if (sji + matrix[cluster - 1][jlow - 1] >= matrix[cluster][i]) {
        break
      }

      // Examine the lower bound of the cluster border
      sjlowi = ssq(jlow, i, sums, sumsOfSquares);

      ssqjlow = sjlowi + matrix[cluster - 1][jlow - 1];

      if (ssqjlow < matrix[cluster][i]) {
        // Shrink the lower bound
        matrix[cluster][i] = ssqjlow;
        backtrackMatrix[cluster][i] = jlow;
      }
      jlow++;

      ssqj = sji + matrix[cluster - 1][j - 1];
      if (ssqj < matrix[cluster][i]) {
        matrix[cluster][i] = ssqj;
        backtrackMatrix[cluster][i] = j;
      }
    }

    fillMatrixColumn(
      iMin,
      i - 1,
      cluster,
      matrix,
      backtrackMatrix,
      sums,
      sumsOfSquares
    );
    fillMatrixColumn(
      i + 1,
      iMax,
      cluster,
      matrix,
      backtrackMatrix,
      sums,
      sumsOfSquares
    );
  }

  /**
   * Initializes the main matrices used in Ckmeans and kicks
   * off the divide and conquer cluster computation strategy
   *
   * @private
   * @param {Array<number>} data sorted array of values
   * @param {Array<Array<number>>} matrix
   * @param {Array<Array<number>>} backtrackMatrix
   */
  function fillMatrices(data, matrix, backtrackMatrix) {
    const nValues = matrix[0].length;

    // Shift values by the median to improve numeric stability
    const shift = data[Math.floor(nValues / 2)];

    // Cumulative sum and cumulative sum of squares for all values in data array
    const sums = [];
    const sumsOfSquares = [];

    // Initialize first column in matrix & backtrackMatrix
    for (let i = 0, shiftedValue; i < nValues; ++i) {
      shiftedValue = data[i] - shift;
      if (i === 0) {
        sums.push(shiftedValue);
        sumsOfSquares.push(shiftedValue * shiftedValue);
      } else {
        sums.push(sums[i - 1] + shiftedValue);
        sumsOfSquares.push(sumsOfSquares[i - 1] + shiftedValue * shiftedValue);
      }

      // Initialize for cluster = 0
      matrix[0][i] = ssq(0, i, sums, sumsOfSquares);
      backtrackMatrix[0][i] = 0;
    }

    // Initialize the rest of the columns
    let iMin;
    for (let cluster = 1; cluster < matrix.length; ++cluster) {
      if (cluster < matrix.length - 1) {
        iMin = cluster;
      } else {
        // No need to compute matrix[K-1][0] ... matrix[K-1][N-2]
        iMin = nValues - 1;
      }

      fillMatrixColumn(
        iMin,
        nValues - 1,
        cluster,
        matrix,
        backtrackMatrix,
        sums,
        sumsOfSquares
      );
    }
  }

  const methodMap = {
    EqualInterval: classifyEqInterval,
    StandardDeviation: classifyStdDeviation,
    Quantile: classifyQuantile,
    Jenks: classifyJenks,
    CKMeans: classifyCkmeans
  };

  function bin (data, binInstructions) {
    if (binInstructions.constructor === Object) {
      const intervalBounds = getIntervalBounds(data, binInstructions);
      const ranges = pairRanges(intervalBounds);

      return bin1d(data, binInstructions.column, ranges)
    }

    if (binInstructions.constructor === Array) {
      const intervalBoundsPerVariable = binInstructions.map(instructions => getIntervalBounds(data, instructions));
      const rangesPerVariable = intervalBoundsPerVariable.map(bounds => pairRanges(bounds));
      const variables = binInstructions.map(instructions => instructions.column);

      return binKd(data, variables, rangesPerVariable)
    }
  }

  function getIntervalBounds (data, binInstructions) {
    const { column, method, numClasses } = parseBinInstructions(binInstructions);

    const variableData = data[column];
    if (!variableData) {
      throw new Error(`Column '${column}' does not exist`)
    }

    if (method === 'IntervalSize') {
      return createRangesFromBinSize(variableData, binInstructions.binSize)
    }

    if (method === 'Manual') {
      return binInstructions.manualClasses
    }

    return methodMap[method](variableData, numClasses)
  }

  function parseBinInstructions (binInstructions) {
    if (binInstructions.constructor !== Object) {
      throw new Error('Bin only accepts an Object')
    }

    const column = binInstructions.column;
    if (column.constructor !== String) {
      throw new Error('column only accepts a String variable name')
    }

    return binInstructions
  }

  function createRangesFromBinSize (variableData, binSize) {
    if (!binSize) {
      throw new Error('Missing required option \'binSize\'')
    }

    const domain = calculateDomain(variableData);

    const binCount = Math.floor((domain[1] - domain[0]) / binSize);

    let lowerBound = domain[0];
    const ranges = [lowerBound];

    for (let i = 0; i < binCount - 1; i++) {
      const upperBound = lowerBound + binSize;
      ranges.push(upperBound);
      lowerBound = upperBound;
    }

    ranges.push(domain[1]);

    return ranges
  }

  function pairRanges (ranges) {
    const l = ranges.length;
    const newRange = [];

    for (let i = 0; i < l - 1; i++) {
      newRange.push([ranges[i], ranges[i + 1]]);
    }

    return newRange
  }

  function bin1d (data, variable, ranges) {
    // Create an empty array to store new groups divided by range
    const groups = Array(ranges.length);

    for (let i = 0; i < groups.length; i++) {
      groups[i] = {};

      for (const col in data) {
        groups[i][col] = [];
      }
    }

    const length = getDataLength(data);

    for (let i = 0; i < length; i++) {
      const value = data[variable][i];
      const binIndex = getBinIndex(ranges, value);

      if (binIndex !== -1) {
        for (const col in data) {
          groups[binIndex][col].push(data[col][i]);
        }
      }
    }

    // Remove empty bins
    const nonEmptyBinIndices = getNonEmptyBinIndices(groups);
    const nonEmptyRanges = nonEmptyBinIndices.map(i => ranges[i]);
    const nonEmptyGroups = nonEmptyBinIndices.map(i => groups[i]);

    // Add new grouped column to newData
    const newData = {
      bins: nonEmptyRanges,
      $grouped: nonEmptyGroups.map(group => new DataContainer(group, { validate: false }))
    };

    return newData
  }

  function getBinIndex (bins, value) {
    // Find index of bin in which the instance belongs
    const binIndex = bins.findIndex(function (bin, i) {
      if (i === bins.length - 1) {
        return value >= bin[0] && value <= bin[1]
      } else {
        return value >= bin[0] && value < bin[1]
      }
    });

    return binIndex
  }

  function getNonEmptyBinIndices (groups) {
    const nonEmptyBinIndices = [];

    for (let i = 0; i < groups.length; i++) {
      if (getDataLength(groups[i]) > 0) nonEmptyBinIndices.push(i);
    }

    return nonEmptyBinIndices
  }

  function binKd (data, variables, rangesPerVariable) {
    const binIndexTree = constructBinIndexTree(data, variables, rangesPerVariable);
    const binnedData = convertTreeIntoColumnData(binIndexTree, variables, rangesPerVariable);

    binnedData.$grouped = binnedData.$grouped.map(group => new DataContainer(group, { validate: false }));

    return binnedData
  }

  function constructBinIndexTree (data, variables, rangesPerVariable) {
    let binIndexTree = {};
    const dataLength = getDataLength(data);

    for (let i = 0; i < dataLength; i++) {
      const binIndices = getBinIndices(data, i, variables, rangesPerVariable);
      if (rowIsNotEmpty(binIndices)) {
        binIndexTree = updateBranch(binIndexTree, binIndices, data, i);
      }
    }

    return binIndexTree
  }

  function getBinIndices (data, index, variables, rangesPerVariable) {
    const binIndices = [];

    for (let i = 0; i < variables.length; i++) {
      const variable = variables[i];
      const value = data[variable][index];

      binIndices.push(getBinIndex(rangesPerVariable[i], value));
    }

    return binIndices
  }

  function rowIsNotEmpty (binIndices) {
    return binIndices.every(binIndex => binIndex > -1)
  }

  function updateBranch (tree, indices, data, rowIndex) {
    let currentLevel = tree;

    for (let i = 0; i < indices.length; i++) {
      const index = indices[i];

      if (lastIndex(i, indices.length)) {
        if (!(index in currentLevel)) {
          currentLevel[index] = initGroup(data);
        }

        currentLevel[index] = addRow(currentLevel[index], data, rowIndex);
      } else {
        if (!(index in currentLevel)) {
          currentLevel[index] = {};
        }

        currentLevel = currentLevel[index];
      }
    }

    return tree
  }

  function lastIndex (i, length) {
    return i === (length - 1)
  }

  function initGroup (data) {
    const group = {};
    for (const columnName in data) {
      group[columnName] = [];
    }

    return group
  }

  function addRow (group, data, rowIndex) {
    for (const columnName in data) {
      group[columnName].push(data[columnName][rowIndex]);
    }

    return group
  }

  function convertTreeIntoColumnData (binIndexTree, variables, binsPerVariable) {
    const columnData = initColumnData$1(variables);
    const dataIndex = variables.length;

    forEachBranch(binIndexTree, branchArray => {
      for (let i = 0; i < variables.length; i++) {
        const binIndex = branchArray[i];
        const bin = binsPerVariable[i][binIndex];

        const binnedColumnName = getBinnedColumnName(variables[i]);

        columnData[binnedColumnName].push(bin);
      }

      columnData.$grouped.push(branchArray[dataIndex]);
    });

    return columnData
  }

  function initColumnData$1 (variables) {
    const columnData = { $grouped: [] };

    for (let i = 0; i < variables.length; i++) {
      const binnedColumnName = getBinnedColumnName(variables[i]);
      columnData[binnedColumnName] = [];
    }

    return columnData
  }

  function forEachBranch (tree, callback) {
    for (const path of traverse(tree)) {
      callback(path);
    }
  }

  // https://stackoverflow.com/a/45628445
  function * traverse (o) {
    const memory = new Set();

    function * innerTraversal (o, path = []) {
      if (memory.has(o)) {
        // we've seen this object before don't iterate it
        return
      }

      // add the new object to our memory.
      memory.add(o);

      for (const i of Object.keys(o)) {
        const itemPath = path.concat(i);

        if (!('$key' in o[i])) {
          yield * innerTraversal(o[i], itemPath);
        } else {
          itemPath.push(o[i]);
          yield itemPath;
        }
      }
    }

    yield * innerTraversal(o);
  }

  function getBinnedColumnName (columnName) {
    return 'bins_' + columnName
  }

  function dropNA (data, dropInstructions) {
    let filterFunc;

    if (!dropInstructions) {
      // If the instructions are falsy, we will check all columns for invalid values
      filterFunc = row => {
        let keep = true;

        for (const key in row) {
          const val = row[key];
          if (isInvalid(val)) {
            keep = false;
            break
          }
        }

        return keep
      };
    } else if (dropInstructions.constructor === String) {
      // If the instructions are a string, we check only one column for invalid values
      checkIfColumnsExist(data, [dropInstructions]);
      filterFunc = row => !isInvalid(row[dropInstructions]);
    } else if (dropInstructions.constructor === Array) {
      // if the instructions are an array, we check the columns named in the array
      checkIfColumnsExist(data, dropInstructions);
      filterFunc = row => {
        let keep = true;
        for (const col of dropInstructions) {
          if (isInvalid(row[col])) {
            keep = false;
            break
          }
        }

        return keep
      };
    } else {
      throw new Error('dropNA can only be passed undefined, a String or an Array of Strings')
    }

    return filter(data, filterFunc)
  }

  function checkIfColumnsExist (data, columns) {
    for (const col of columns) {
      if (!(col in data)) {
        throw new Error(`Column '${col}' not found`)
      }
    }
  }

  function transformGeometries (geometries, transformFunc) {
    const geometriesClone = JSON.parse(JSON.stringify(geometries));

    if (geometriesClone.constructor === Array) {
      for (let i = 0; i < geometriesClone.length; i++) {
        transformGeometryInplace(geometriesClone[i], transformFunc);
      }
    }

    if (geometriesClone.constructor === Object) {
      for (const key in geometriesClone) {
        transformGeometryInplace(geometriesClone[key], transformFunc);
      }
    }

    return geometriesClone
  }

  function transformGeometryInplace (geometry, transformFunc) {
    coordEach(geometry, coord => {
      const transformedPosition = transformFunc(coord);
      coord[0] = transformedPosition[0];
      coord[1] = transformedPosition[1];
    });
  }

  function reproject (data, transformation) {
    if (!('$geometry' in data)) {
      warn('No geometry column found. Skipping reproject-transformation.');
      return data
    }

    const transformedGeometries = transformGeometries(data.$geometry, transformation);

    const newData = Object.assign({}, data);
    newData.$geometry = transformedGeometries;

    return newData
  }

  function transform (data, transformFunction) {
    if (transformFunction.constructor !== Function) {
      throw new Error('Invalid \'transform\' transformation: must be a Function')
    }

    return transformFunction(data)
  }

  function cumsum (data, cumsumInstructions, options = { asInterval: false }) {
    const asInterval = options.asInterval;
    const length = getDataLength(data);
    const newColumns = {};

    for (const newColName in cumsumInstructions) {
      checkRegularColumnName(newColName);

      const oldColName = cumsumInstructions[newColName];

      if (getColumnType(data[oldColName]) !== 'quantitative') {
        throw new Error('cumsum columns can only be of type \'quantitative\'')
      }

      let previousSum = 0;
      let currentSum = 0;
      newColumns[newColName] = [];

      for (let i = 0; i < length; i++) {
        const value = data[oldColName][i];

        if (!isInvalid(value)) {
          currentSum += value;
        }

        if (asInterval) {
          newColumns[newColName].push([previousSum, currentSum]);
        } else {
          newColumns[newColName].push(currentSum);
        }

        previousSum = currentSum;
      }
    }

    let newData = Object.assign({}, data);
    newData = Object.assign(newData, newColumns);

    return newData
  }

  function rowCumsum (data, _cumsumInstructions, options = { asInterval: false }) {
    const asInterval = options.asInterval;
    const cumsumInstructions = parseCumsumInstructions(_cumsumInstructions);
    validateColumns(data, cumsumInstructions);

    const rowCumsumColumns = {};
    let previousColumnName;

    for (const [newName, oldName] of cumsumInstructions) {
      checkRegularColumnName(newName);
      const oldColumn = data[oldName];

      if (previousColumnName === undefined) {
        if (asInterval) {
          rowCumsumColumns[newName] = oldColumn.map(value => [0, value]);
        } else {
          rowCumsumColumns[newName] = oldColumn;
        }
      } else {
        const previousColumn = rowCumsumColumns[previousColumnName];
        let newColumn;

        if (asInterval) {
          newColumn = oldColumn.map((value, i) => {
            const previousValue = previousColumn[i][1];
            const newValue = previousValue + value;
            return [previousValue, newValue]
          });
        } else {
          newColumn = oldColumn.map((value, i) => value + previousColumn[i]);
        }

        rowCumsumColumns[newName] = newColumn;
      }

      previousColumnName = newName;
    }

    let newData = Object.assign({}, data);
    newData = Object.assign(newData, rowCumsumColumns);

    return newData
  }

  const invalidInstructionsError = new Error('Invalid rowCumsum instrutions');

  function parseCumsumInstructions (cumsumInstructions) {
    if (cumsumInstructions && cumsumInstructions.constructor === Array) {
      const parsedInstructions = [];

      for (const instruction of cumsumInstructions) {
        validateInstruction(instruction);

        if (instruction.constructor === String) {
          parsedInstructions.push([instruction, instruction]);
        }

        if (instruction.constructor === Object) {
          const newName = Object.keys(instruction)[0];
          const oldName = instruction[newName];
          parsedInstructions.push([newName, oldName]);
        }
      }

      return parsedInstructions
    }

    throw invalidInstructionsError
  }

  function validateInstruction (instruction) {
    if (instruction.constructor === String) return

    if (instruction.constructor === Object) {
      if (Object.keys(instruction).length === 1) return
    }

    throw invalidInstructionsError
  }

  function validateColumns (data, stackInstructions) {
    for (const [, oldName] of stackInstructions) {
      const column = data[oldName];

      if (!column) {
        throw new Error(`Column '${oldName}' does not exist`)
      }

      const columnType = getColumnType(column);

      if (columnType !== 'quantitative') {
        throw new Error('rowCumsum columns can only be of type \'quantitative\'')
      }
    }
  }

  const transformations = {
    filter,
    select,
    arrange,
    rename,
    mutate,
    transmute,
    summarise,
    mutarise,
    groupBy,
    bin,
    dropNA,
    reproject,
    transform,
    cumsum,
    rowCumsum
  };

  const methods$2 = {
    arrange (sortInstructions) {
      const data = transformations.arrange(this._data, sortInstructions);
      return new DataContainer(data, { validate: false })
    },

    bin (binInstructions) {
      const data = transformations.bin(this._data, binInstructions);
      return new DataContainer(data, { validate: false })
    },

    cumsum (cumsumInstructions, options) {
      const data = transformations.cumsum(this._data, cumsumInstructions, options);
      return new DataContainer(data, { validate: false })
    },

    dropNA (dropInstructions) {
      const data = transformations.dropNA(this._data, dropInstructions);
      return new DataContainer(data, { validate: false })
    },

    filter (filterFunction) {
      const data = transformations.filter(this._data, filterFunction);
      return new DataContainer(data, { validate: false })
    },

    groupBy (groupByInstructions) {
      const data = transformations.groupBy(this._data, groupByInstructions);
      return new DataContainer(data, { validate: false })
    },

    mutarise (mutariseInstructions) {
      const data = transformations.mutarise(this._data, mutariseInstructions);
      return new DataContainer(data, { validate: false })
    },

    mutarize (mutariseInstructions) {
      const data = transformations.mutarise(this._data, mutariseInstructions);
      return new DataContainer(data, { validate: false })
    },

    mutate (mutateInstructions) {
      const data = transformations.mutate(this._data, mutateInstructions);
      return new DataContainer(data, { validate: false })
    },

    transmute (transmuteInstructions) {
      const data = transformations.transmute(this._data, transmuteInstructions);
      return new DataContainer(data, { validate: false })
    },

    rename (renameInstructions) {
      const data = transformations.rename(this._data, renameInstructions);
      return new DataContainer(data, { validate: false })
    },

    reproject (reprojectInstructions) {
      const data = transformations.reproject(this._data, reprojectInstructions);
      return new DataContainer(data, { validate: false })
    },

    rowCumsum (cumsumInstructions, options) {
      const data = transformations.rowCumsum(this._data, cumsumInstructions, options);
      return new DataContainer(data, { validate: false })
    },

    select (selection) {
      const data = transformations.select(this._data, selection);
      return new DataContainer(data, { validate: false })
    },

    summarise (summariseInstructions) {
      const data = transformations.summarise(this._data, summariseInstructions);
      return new DataContainer(data, { validate: false })
    },

    summarize (summariseInstructions) {
      const data = transformations.summarise(this._data, summariseInstructions);
      return new DataContainer(data, { validate: false })
    },

    transform (transformFunction) {
      const data = transformations.transform(this._data, transformFunction);
      return new DataContainer(data, { validate: false })
    }
  };

  function transformationsMixin (targetClass) {
    Object.assign(targetClass.prototype, methods$2);
  }

  function ensureValidRow (row, self) {
    for (const columnName in row) {
      if (!(columnName in self._data)) throw new Error(`Column '${columnName}' not found`)
    }

    for (const columnName in self._data) {
      if (columnName === '$key') {
        if (columnName in row) throw new Error('Cannot set \'$key\' column')
      } else {
        if (!(columnName in row)) throw new Error(`Missing column '${columnName}'`)

        const value = row[columnName];
        ensureValueIsRightForColumn(value, columnName, self);
      }
    }
  }

  function ensureValidRowUpdate (row, self) {
    for (const columnName in row) {
      if (!(columnName in self._data)) throw new Error(`Column '${columnName}' not found`)

      const value = row[columnName];
      ensureValueIsRightForColumn(value, columnName, self);
    }
  }

  function ensureRowExists (accessorObject, self) {
    if (isUndefined(self._rowIndex(accessorObject))) {
      throw new Error(`Invalid accessor object: '${accessorObject.toString()}'`)
    }
  }

  function ensureValueIsRightForColumn (value, columnName, self) {
    if (!isInvalid(value)) {
      const columnType = getColumnType(self._data[columnName]);

      ensureValidDataType(value);
      const valueType = getDataType(value);

      if (columnType !== valueType) {
        throw new Error(`Column '${columnName}' is of type '${columnType}'. Received value of type '${valueType}'`)
      }
    }
  }

  function isValidColumn (column, columnName) {
    const columnType = getColumnType(column);

    if (columnType === undefined) return false
    if (!columnNameMatchesType(columnName, columnType)) return false
    if (!allValidValuesHaveTheSameType(column, columnType)) return false

    return true
  }

  function ensureValidColumn (column, columnName) {
    const { nValidValues } = findFirstValidValue(column);

    if (nValidValues === 0) {
      throw new Error(`Invalid column '${columnName}'. Column contains only invalid values.`)
    }

    const columnType = getColumnType(column);

    if (columnType === undefined) throw new Error(`Column '${columnName}' contains data of unknown type`)
    ensureColumnNameMatchesType(columnType);
    ensureAllValidValuesHaveTheSameType(column, columnType, columnName);
  }

  function columnNameMatchesType (columnName, columnType) {
    if (columnName === '$geometry' && columnType !== 'geometry') return false
    if (columnName !== '$geometry' && columnType === 'geometry') return false

    return true
  }

  function ensureColumnNameMatchesType (columnName, columnType) {
    if (columnName === '$geometry' && columnType !== 'geometry') {
      throw new Error(`Column '$geometry' can only contain data of type 'geometry', received '${columnType}'`)
    }

    if (columnName !== '$geometry' && columnType === 'geometry') {
      throw new Error(`Only the '$geometry' column can contain data of type 'geometry'`)
    }
  }

  function allValidValuesHaveTheSameType (column, columnType) {
    for (let i = 0; i < column.length; i++) {
      const value = column[i];

      if (isInvalid(value)) continue

      const valueType = getDataType(value);

      if (valueType !== columnType) {
        return false
      }
    }

    return true
  }

  function ensureAllValidValuesHaveTheSameType (column, columnType, columnName) {
    if (!allValidValuesHaveTheSameType(column, columnType)) {
      throw new Error(`Column '${columnName}' mixes types`)
    }
  }

  function columnExists (columnName, self) {
    return columnName in self._data
  }

  function ensureColumnExists (columnName, self) {
    if (!columnExists(columnName, self)) {
      throw new Error(`Invalid column name: '${columnName}'`)
    }
  }

  const methods$3 = {
    // Rows
    addRow (row) {
      ensureValidRow(row, this);

      for (const columnName in row) {
        const value = row[columnName];
        this._data[columnName].push(value);

        this._updateDomainIfNecessary(columnName, value);
      }

      const rowIndex = getDataLength(this._data) - 1;

      if (!this._keyColumn) {
        const keyDomain = this.domain('$key');
        keyDomain[1]++;
        const key = keyDomain[1];

        this._data.$key.push(key);
        this._keyToRowIndex.set(key, rowIndex);
      }

      if (this._keyColumn) {
        const key = row[this._keyColumn];

        if (this._keyToRowIndex.has(key)) {
          throw new Error(`Duplicate key '${key}'`)
        }

        this._keyToRowIndex.set(key, rowIndex);
      }
    },

    updateRow (accessorObject, row) {
      if (row.constructor === Function) {
        const result = row(this.row(accessorObject));

        if (!(result && result.constructor === Object)) {
          throw new Error('updateRow function must return Object')
        }

        this.updateRow(accessorObject, result);
      }

      ensureRowExists(accessorObject, this);
      ensureValidRowUpdate(row, this);

      const rowIndex = this._rowIndex(accessorObject);

      if (this._keyColumn && this._keyColumn in row) {
        const oldKey = this._row(rowIndex).$key;
        const newKey = row[this._keyColumn];

        if (
          newKey !== oldKey &&
          this._keyToRowIndex.has(newKey)
        ) {
          throw new Error(`Duplicate key '${newKey}'`)
        }

        this._keyToRowIndex.delete(oldKey);
        this._keyToRowIndex.set(newKey, rowIndex);
      }

      for (const columnName in row) {
        throwErrorIfColumnIsKey(columnName);

        const value = row[columnName];
        this._data[columnName][rowIndex] = value;

        this._resetDomainIfNecessary(columnName);
      }
    },

    deleteRow (accessorObject) {
      ensureRowExists(accessorObject, this);

      const rowIndex = this._rowIndex(accessorObject);
      const key = this._row(rowIndex).$key;

      this._keyToRowIndex.delete(key);

      for (const columnName in this._data) {
        if (!(this._keyColumn && columnName === '$key')) {
          this._data[columnName].splice(rowIndex, 1);
          this._resetDomainIfNecessary(columnName);
        }
      }
    },

    // Columns
    addColumn (columnName, column) {
      this._validateNewColumn(columnName, column);
      this._data[columnName] = column;
    },

    replaceColumn (columnName, column) {
      this.deleteColumn(columnName);
      this.addColumn(columnName, column);
    },

    deleteColumn (columnName) {
      ensureColumnExists(columnName, this);
      throwErrorIfColumnIsKey(columnName);

      if (Object.keys(this._data).length === 2) {
        throw new Error('Cannot delete last column')
      }

      delete this._data[columnName];
    },

    // Private methods
    _updateDomainIfNecessary (columnName, value) {
      const type = getDataType(value);

      if (columnName in this._domains) {
        this._domains[columnName] = updateDomain(
          this._domains[columnName],
          value,
          type
        );
      }
    },

    _resetDomainIfNecessary (columnName) {
      if (columnName in this._domains) {
        delete this._domains[columnName];
      }
    },

    _validateNewColumn (columnName, column) {
      checkRegularColumnName(columnName);

      if (columnName in this._data) {
        throw new Error(`Column '${columnName}' already exists`)
      }

      const dataLength = getDataLength(this._data);
      if (dataLength !== column.length) {
        throw new Error('Column must be of same length as rest of data')
      }

      ensureValidColumn(column);
    }
  };

  function modifyingRowsAndColumnsMixin (targetClass) {
    Object.assign(targetClass.prototype, methods$3);
  }

  function throwErrorIfColumnIsKey (columnName) {
    if (columnName === '$key') throw new Error('Cannot modify key column')
  }

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function bisector(f) {
    let delta = f;
    let compare = f;

    if (f.length === 1) {
      delta = (d, x) => f(d) - x;
      compare = ascendingComparator(f);
    }

    function left(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (compare(a[mid], x) < 0) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    }

    function right(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (compare(a[mid], x) > 0) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    }

    function center(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      const i = left(a, x, lo, hi);
      return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
    }

    return {left, center, right};
  }

  function ascendingComparator(f) {
    return (d, x) => ascending(f(d), x);
  }

  var ascendingBisect = bisector(ascending);
  var bisectRight = ascendingBisect.right;

  function initRange(domain, range) {
    switch (arguments.length) {
      case 0: break;
      case 1: this.range(domain); break;
      default: this.range(range).domain(domain); break;
    }
    return this;
  }

  function threshold() {
    var domain = [0.5],
        range = [0, 1],
        unknown,
        n = 1;

    function scale(x) {
      return x <= x ? range[bisectRight(domain, x, 0, n)] : unknown;
    }

    scale.domain = function(_) {
      return arguments.length ? (domain = Array.from(_), n = Math.min(domain.length, range.length - 1), scale) : domain.slice();
    };

    scale.range = function(_) {
      return arguments.length ? (range = Array.from(_), n = Math.min(domain.length, range.length - 1), scale) : range.slice();
    };

    scale.invertExtent = function(y) {
      var i = range.indexOf(y);
      return [domain[i - 1], domain[i]];
    };

    scale.unknown = function(_) {
      return arguments.length ? (unknown = _, scale) : unknown;
    };

    scale.copy = function() {
      return threshold()
          .domain(domain)
          .range(range)
          .unknown(unknown);
    };

    return initRange.apply(scale, arguments);
  }

  const methods$4 = {
    bounds (binInstructions) {
      const bounds = this.fullBounds(binInstructions);
      return bounds.slice(1, bounds.length - 1)
    },

    fullBounds (binInstructions) {
      if (this.type(binInstructions.column) !== 'quantitative') {
        throw new Error('Column should be of type \'quantitative\'')
      }

      const bounds = getIntervalBounds(
        this._data,
        binInstructions
      );

      return bounds
    },

    boundRanges (binInstructions) {
      const bounds = this.fullBounds(binInstructions);
      const boundRanges = [];

      for (let i = 0; i < bounds.length - 1; i++) {
        boundRanges.push([bounds[i], bounds[i + 1]]);
      }

      return boundRanges
    },

    classify (binInstructions, range) {
      const bounds = this.bounds(binInstructions);

      return threshold()
        .domain(bounds)
        .range(range)
    }
  };

  function classificationMixin (targetClass) {
    Object.assign(targetClass.prototype, methods$4);
  }

  function getJoinColumns (left, right, by) {
    const leftData = left.data();
    const rightData = right.data();

    if (isUndefined(by)) {
      const leftDataLength = getDataLength(leftData);
      const joinColumns = {};

      for (const columnName in rightData) {
        if (columnName !== '$key') {
          const rightColumn = rightData[columnName];
          joinColumns[columnName] = rightColumn.slice(0, leftDataLength);
        }
      }

      return joinColumns
    }

    if (isDefined(by)) {
      const joinColumns = initJoinColumns(rightData, by[1]);

      const rightRowsByKey = generateRightRowsByKey(rightData, by[1]);
      const leftByColumn = leftData[by[0]];

      for (let i = 0; i < leftByColumn.length; i++) {
        const leftKey = leftByColumn[i];
        const row = rightRowsByKey[leftKey];

        for (const columnName in row) {
          joinColumns[columnName].push(row[columnName]);
        }
      }

      return joinColumns
    }
  }

  function initJoinColumns (right, byColumnName) {
    const joinColumns = {};

    for (const columnName in right) {
      if (columnName !== '$key' && columnName !== byColumnName) {
        joinColumns[columnName] = [];
      }
    }

    return joinColumns
  }

  function generateRightRowsByKey (right, byColumnName) {
    const rightRowsByKey = {};
    const byColumn = right[byColumnName];

    for (let i = 0; i < byColumn.length; i++) {
      const key = byColumn[i];
      const row = {};

      for (const columnName in right) {
        if (columnName !== '$key' && columnName !== byColumnName) {
          row[columnName] = right[columnName][i];
        }
      }

      rightRowsByKey[key] = row;
    }

    return rightRowsByKey
  }

  function validateJoin (left, right, by) {
    const leftData = left.data();
    const rightData = getRightData(right);

    if (isUndefined(by)) {
      const leftLength = getDataLength(leftData);
      const rightLength = getDataLength(rightData);

      if (rightLength < leftLength) {
        throw new Error(
          'Without \'by\', the right DataContainer must be the same length as or longer than left DataContainer'
        )
      }
    }

    if (isDefined(by)) {
      validateByColumnsExist(leftData, rightData, by);
      ensureColumnsAreCompatible(leftData, rightData, by);
      ensureNoDuplicateColumnNames(leftData, rightData, by);
    }
  }

  function getRightData (right) {
    if (!(right instanceof DataContainer)) {
      throw new Error('It is only possible to join another DataContainer')
    }

    return right.data()
  }

  function validateByColumnsExist (left, right, by) {
    if (!(by.constructor === Array && by.length === 2 && by.every(c => c.constructor === String))) {
      throw new Error('Invalid format of \'by\'. Must be Array of two column names.')
    }

    const [leftColumnName, rightColumnName] = by;

    if (!(leftColumnName in left)) {
      throw new Error(`Column '${leftColumnName}' not found`)
    }

    if (!(rightColumnName in right)) {
      throw new Error(`Column '${rightColumnName}' not found`)
    }
  }

  function ensureColumnsAreCompatible (left, right, by) {
    const [leftColumnName, rightColumnName] = by;
    const leftColumn = left[leftColumnName];
    const rightColumn = right[rightColumnName];

    const leftType = getColumnType(leftColumn);
    const rightType = getColumnType(rightColumn);

    if (leftType !== rightType) throw new Error('\'by\' columns must be of the same type')

    ensureRightByColumnIsUnique(right[rightColumnName]);
    ensureLeftColumnIsSubsetOfRightColumn(leftColumn, rightColumn);
  }

  function ensureRightByColumnIsUnique (column) {
    if (column.length !== new Set(column).size) {
      throw new Error('Right \'by\' column must contain only unique values')
    }
  }

  function ensureLeftColumnIsSubsetOfRightColumn (leftColumn, rightColumn) {
    const rightSet = new Set(rightColumn);

    for (let i = 0; i < leftColumn.length; i++) {
      const leftKey = leftColumn[i];
      if (!rightSet.has(leftKey)) {
        throw new Error('Left \'by\' column must be subset of right column')
      }
    }
  }

  function ensureNoDuplicateColumnNames (left, right, by) {
    const rightColumnName = by[1];

    for (const columnName in right) {
      if (columnName !== '$key' && columnName in left) {
        if (columnName !== rightColumnName) {
          throw new Error(`Duplicate column name: '${columnName}'`)
        }
      }
    }
  }

  function validateAccessorObject (accessorObject) {
    const keys = Object.keys(accessorObject);

    if (
      accessorObject &&
      accessorObject.constructor === Object &&
      keys.length === 1 &&
      ['index', 'key'].includes(keys[0])
    ) {
      return
    }

    throw new Error('Invalid accessor object, must be either \'{ index: <index> }\'  or \'{ key: <key> }\'')
  }

  class DataContainer {
    constructor (data, options = { validate: true }) {
      this._data = {};
      this._keyToRowIndex = new Map();
      this._keyColumn = null;
      this._domains = {};

      if (isColumnOriented(data)) {
        this._setColumnData(data, options);
        return
      }

      if (isRowOriented(data)) {
        this._setRowData(data, options);
        return
      }

      if (isGeoJSON(data)) {
        this._setGeoJSON(data, options);
        return
      }

      if (data instanceof Group) {
        this._setGroup(data, options);
        return
      }

      throw invalidDataError
    }

    // Accessing data
    data () {
      return this._data
    }

    row (accessorObject) {
      const rowIndex = this._rowIndex(accessorObject);
      return this._row(rowIndex)
    }

    rows () {
      const rows = [];
      const length = getDataLength(this._data);

      for (let i = 0; i < length; i++) {
        rows.push(this._row(i));
      }

      return rows
    }

    column (columnName) {
      ensureColumnExists(columnName, this);
      return this._data[columnName]
    }

    map (columnName, mapFunction) {
      return this.column(columnName).map(mapFunction)
    }

    domain (columnName) {
      if (columnName in this._domains) {
        return this._domains[columnName]
      }

      const column = this.column(columnName);
      const domain = calculateDomain(column, columnName);
      this._domains[columnName] = domain;
      return domain
    }

    bbox () {
      return this.domain('$geometry')
    }

    min (columnName) {
      if (this.type(columnName) !== 'quantitative') {
        throw new Error('Column must be quantitative')
      }

      return this.domain(columnName)[0]
    }

    max (columnName) {
      if (this.type(columnName) !== 'quantitative') {
        throw new Error('Column must be quantitative')
      }

      return this.domain(columnName)[1]
    }

    type (columnName) {
      const column = this.column(columnName);
      return getColumnType(column)
    }

    columnNames () {
      return Object.keys(this._data)
    }

    // Checks
    hasColumn (columnName) {
      return columnExists(columnName, this)
    }

    columnIsValid (columnName) {
      const column = this.column(columnName);
      return isValidColumn(column, columnName)
    }

    validateColumn (columnName) {
      const column = this.column(columnName);
      ensureValidColumn(column, columnName);
    }

    validateAllColumns () {
      for (const columnName in this._data) {
        this.validateColumn(columnName);
      }
    }

    // Join
    join (dataContainer, { by = undefined } = {}) {
      validateJoin(this, dataContainer, by);
      const joinColumns = getJoinColumns(this, dataContainer, by);

      for (const columnName in joinColumns) {
        this.addColumn(columnName, joinColumns[columnName]);
      }
    }

    // Private methods
    _rowIndex (accessorObject) {
      validateAccessorObject(accessorObject);

      const rowIndex = 'key' in accessorObject
        ? this._keyToRowIndex.get(accessorObject.key)
        : accessorObject.index;

      return rowIndex
    }

    _row (rowIndex) {
      const length = getDataLength(this._data);

      if (rowIndex < 0 || rowIndex >= length) {
        return undefined
      }

      const row = {};

      for (const columnName in this._data) {
        const value = this._data[columnName][rowIndex];
        row[columnName] = value;
      }

      return row
    }
  }

  dataLoadingMixin(DataContainer);
  keyMixin(DataContainer);
  transformationsMixin(DataContainer);
  modifyingRowsAndColumnsMixin(DataContainer);
  classificationMixin(DataContainer);

  const invalidDataError = new Error('Data passed to DataContainer is of unknown format');

  return DataContainer;

})));
