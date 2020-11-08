'use strict';

var d3Geo = require('d3-geo');

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
    throw new Error(`Invalid column name '${columnName}': '$' and '/' are not allowed'`)
  }
}

const forbiddenChars = /[/$]/;

function checkInternalDataColumnName (columnName) {
  if (!['$key', '$geometry', '$grouped'].includes(columnName)) {
    checkRegularColumnName(columnName);
  }
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

function calculateBBoxGeometries (geometries) {
  let bbox = [[Infinity, Infinity], [-Infinity, -Infinity]];

  for (let i = 0; i < geometries.length; i++) {
    const geometry = geometries[i];

    if (!isInvalid(geometry)) {
      bbox = updateBBox(bbox, geometry);
    }
  }

  const bboxObj = {
    x: [bbox[0][0], bbox[1][0]],
    y: [bbox[0][1], bbox[1][1]]
  };

  return bboxObj
}

const path = d3Geo.geoPath();

function updateBBox (bbox, geometry) {
  const newBBox = path.bounds(geometry);

  bbox[0][0] = bbox[0][0] < newBBox[0][0] ? bbox[0][0] : newBBox[0][0];
  bbox[0][1] = bbox[0][1] < newBBox[0][1] ? bbox[0][1] : newBBox[0][1];
  bbox[1][0] = bbox[1][0] > newBBox[1][0] ? bbox[1][0] : newBBox[1][0];
  bbox[1][1] = bbox[1][1] > newBBox[1][1] ? bbox[1][1] : newBBox[1][1];

  return bbox
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

function generateKeyColumn (length) {
  return new Array(length).fill(0).map((_, i) => i)
}

function validateKeyColumn (keyColumn, requiredLength) {
  if (keyColumn.length !== requiredLength) {
    throw new Error('Key column must be of same length as rest of the data')
  }

  ensureAllSameType(keyColumn);
  ensureUnique(keyColumn);
}

function ensureAllSameType (keyColumn) {
  for (let i = 0; i < keyColumn.length; i++) {
    const key = keyColumn[i];
    validateKey(key);
  }
}

function validateKey (key) {
  const type = getDataType(key);

  if (type !== 'quantitative' || !Number.isInteger(key)) {
    throw new Error('Key column can contain only integers')
  }
}

function ensureUnique (keyColumn) {
  if (keyColumn.length !== new Set(keyColumn).size) {
    throw new Error('Keys must be unique')
  }
}

function getDataLength (data) {
  const firstKey = Object.keys(data)[0];
  const firstColumn = data[firstKey];
  return firstColumn.length
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
  },

  _setupKeyColumn () {
    const length = getDataLength(this._data);

    if ('$key' in this._data) {
      validateKeyColumn(this._data.$key, length);
      this._syncKeyToRowNumber();
    } else {
      const keyColumn = generateKeyColumn(length);
      this._setKeyColumn(keyColumn);
    }
  },

  _setKeyColumn (keyColumn) {
    this._data.$key = keyColumn;

    this._syncKeyToRowNumber();
  },

  _syncKeyToRowNumber () {
    const length = getDataLength(this._data);

    for (let i = 0; i < length; i++) {
      const key = this._data.$key[i];
      this._keyToRowNumber[key] = i;
    }
  }
};

function dataLoadingMixin (targetClass) {
  Object.assign(targetClass.prototype, methods);
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
    throw new Error(`Unknown transformation ${key}`)
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
* geostats() is a tiny and standalone javascript library for classification
* Project page - https://github.com/simogeo/geostats
* Copyright (c) 2011 Simon Georget, http://www.intermezzo-coop.eu
* Licensed under the MIT license
*/

var _t = function (str) {
  return str
};

// taking from http://stackoverflow.com/questions/18082/validate-decimal-numbers-in-javascript-isnumeric
var isNumber = function (n) {
  return !isNaN(parseFloat(n)) && isFinite(n)
};

function Geostats (a) {
  this.objectID = '';
  this.separator = ' - ';
  this.legendSeparator = this.separator;
  this.method = '';
  this.precision = 0;
  this.precisionflag = 'auto';
  this.roundlength = 2; // Number of decimals, round values
  this.is_uniqueValues = false;
  this.debug = false;
  this.silent = false;

  this.bounds = [];
  this.ranges = [];
  this.inner_ranges = null;
  this.colors = [];
  this.counter = [];

  // statistics information
  this.stat_sorted = null;
  this.stat_mean = null;
  this.stat_median = null;
  this.stat_sum = null;
  this.stat_max = null;
  this.stat_min = null;
  this.stat_pop = null;
  this.stat_variance = null;
  this.stat_stddev = null;
  this.stat_cov = null;

  /**
 * logging method
 */
  this.log = function (msg, force) {
    if (this.debug === true || force != null) {
      console.log(this.objectID + '(object id) :: ' + msg);
    }
  };

  /**
 * Set bounds
 */
  this.setBounds = function (a) {
    this.log('Setting bounds (' + a.length + ') : ' + a.join());

    this.bounds = []; // init empty array to prevent bug when calling classification after another with less items (sample getQuantile(6) and getQuantile(4))

    this.bounds = a;
    // this.bounds = this.decimalFormat(a);
  };

  /**
 * Set a new serie
 */
  this.setSerie = function (a) {
    this.log('Setting serie (' + a.length + ') : ' + a.join());

    this.serie = []; // init empty array to prevent bug when calling classification after another with less items (sample getQuantile(6) and getQuantile(4))
    this.serie = a;

    // reset statistics after changing serie
    this.resetStatistics();

    this.setPrecision();
  };

  /**
 * Set colors
 */
  this.setColors = function (colors) {
    this.log('Setting color ramp (' + colors.length + ') : ' + colors.join());

    this.colors = colors;
  };

  /**
   * Get feature count
   * With bounds array(0, 0.75, 1.5, 2.25, 3);
   * should populate this.counter with 5 keys
   * and increment counters for each key
   */
  this.doCount = function () {
    if (this._nodata()) { return }

    var tmp = this.sorted();

    this.counter = [];

    // we init counter with 0 value
    for (let i = 0; i < this.bounds.length - 1; i++) {
      this.counter[i] = 0;
    }

    for (let j = 0; j < tmp.length; j++) {
      // get current class for value to increment the counter
      var cclass = this.getClass(tmp[j]);
      this.counter[cclass]++;
    }
  };

  /**
   * Set decimal precision according to user input
   * or automatcally determined according
   * to the given serie.
   */
  this.setPrecision = function (decimals) {
    // only when called from user
    if (typeof decimals !== 'undefined') {
      this.precisionflag = 'manual';
      this.precision = decimals;
    }

    // we calculate the maximal decimal length on given serie
    if (this.precisionflag === 'auto') {
      for (var i = 0; i < this.serie.length; i++) {
        // check if the given value is a number and a float
        var precision;
        if (!isNaN((this.serie[i] + '')) && (this.serie[i] + '').toString().indexOf('.') !== -1) {
          precision = (this.serie[i] + '').split('.')[1].length;
        } else {
          precision = 0;
        }

        if (precision > this.precision) {
          this.precision = precision;
        }
      }
    }
    if (this.precision > 20) {
      // prevent "Uncaught RangeError: toFixed() digits argument must be between 0 and 20" bug. See https://github.com/simogeo/geostats/issues/34
      this.log('this.precision value (' + this.precision + ') is greater than max value. Automatic set-up to 20 to prevent "Uncaught RangeError: toFixed()" when calling decimalFormat() method.');
      this.precision = 20;
    }

    this.log('Calling setPrecision(). Mode : ' + this.precisionflag + ' - Decimals : ' + this.precision);

    this.serie = this.decimalFormat(this.serie);
  };

  /**
   * Format array numbers regarding to precision
   */
  this.decimalFormat = function (a) {
    var b = [];

    for (var i = 0; i < a.length; i++) {
      // check if the given value is a number
      if (isNumber(a[i])) {
        b[i] = parseFloat(parseFloat(a[i]).toFixed(this.precision));
      } else {
        b[i] = a[i];
      }
    }

    return b
  };

  /**
   * Transform a bounds array to a range array the following array : array(0,
   * 0.75, 1.5, 2.25, 3); becomes : array('0-0.75', '0.75-1.5', '1.5-2.25',
   * '2.25-3');
   */
  this.setRanges = function () {
    this.ranges = []; // init empty array to prevent bug when calling classification after another with less items (sample getQuantile(6) and getQuantile(4))

    for (let i = 0; i < (this.bounds.length - 1); i++) {
      this.ranges[i] = this.bounds[i] + this.separator + this.bounds[i + 1];
    }
  };

  /** return min value */
  this.min = function () {
    if (this._nodata()) { return }

    this.stat_min = this.serie[0];

    for (let i = 0; i < this.pop(); i++) {
      if (this.serie[i] < this.stat_min) {
        this.stat_min = this.serie[i];
      }
    }

    return this.stat_min
  };

  /** return max value */
  this.max = function () {
    if (this._nodata()) { return }

    this.stat_max = this.serie[0];
    for (let i = 0; i < this.pop(); i++) {
      if (this.serie[i] > this.stat_max) {
        this.stat_max = this.serie[i];
      }
    }

    return this.stat_max
  };

  /** return sum value */
  this.sum = function () {
    if (this._nodata()) { return }

    if (this.stat_sum === null) {
      this.stat_sum = 0;
      for (let i = 0; i < this.pop(); i++) {
        this.stat_sum += parseFloat(this.serie[i]);
      }
    }

    return this.stat_sum
  };

  /** return population number */
  this.pop = function () {
    if (this._nodata()) { return }

    if (this.stat_pop === null) {
      this.stat_pop = this.serie.length;
    }

    return this.stat_pop
  };

  /** return mean value */
  this.mean = function () {
    if (this._nodata()) { return }

    if (this.stat_mean === null) {
      this.stat_mean = parseFloat(this.sum() / this.pop());
    }

    return this.stat_mean
  };

  /** return median value */
  this.median = function () {
    if (this._nodata()) { return }

    if (this.stat_median === null) {
      this.stat_median = 0;
      var tmp = this.sorted();

      // serie pop is odd
      if (tmp.length % 2) {
        this.stat_median = parseFloat(tmp[(Math.ceil(tmp.length / 2) - 1)]);

      // serie pop is even
      } else {
        this.stat_median = (parseFloat(tmp[((tmp.length / 2) - 1)]) + parseFloat(tmp[(tmp.length / 2)])) / 2;
      }
    }

    return this.stat_median
  };

  /** return variance value */
  this.variance = function (round) {
    round = (typeof round === 'undefined');

    if (this._nodata()) { return }

    if (this.stat_variance === null) {
      var tmp = 0;
      var serieMean = this.mean();
      for (var i = 0; i < this.pop(); i++) {
        tmp += Math.pow((this.serie[i] - serieMean), 2);
      }

      this.stat_variance = tmp / this.pop();

      if (round === true) {
        this.stat_variance = Math.round(this.stat_variance * Math.pow(10, this.roundlength)) / Math.pow(10, this.roundlength);
      }
    }

    return this.stat_variance
  };

  /** return standard deviation value */
  this.stddev = function (round) {
    round = (typeof round === 'undefined');

    if (this._nodata()) { return }

    if (this.stat_stddev === null) {
      this.stat_stddev = Math.sqrt(this.variance());

      if (round === true) {
        this.stat_stddev = Math.round(this.stat_stddev * Math.pow(10, this.roundlength)) / Math.pow(10, this.roundlength);
      }
    }

    return this.stat_stddev
  };

  /** coefficient of variation - measure of dispersion */
  this.cov = function (round) {
    round = (typeof round === 'undefined');

    if (this._nodata()) { return }

    if (this.stat_cov === null) {
      this.stat_cov = this.stddev() / this.mean();

      if (round === true) {
        this.stat_cov = Math.round(this.stat_cov * Math.pow(10, this.roundlength)) / Math.pow(10, this.roundlength);
      }
    }

    return this.stat_cov
  };

  /** reset all attributes after setting a new serie */
  this.resetStatistics = function () {
    this.stat_sorted = null;
    this.stat_mean = null;
    this.stat_median = null;
    this.stat_sum = null;
    this.stat_max = null;
    this.stat_min = null;
    this.stat_pop = null;
    this.stat_variance = null;
    this.stat_stddev = null;
    this.stat_cov = null;
  };

  /** data test */
  this._nodata = function () {
    if (this.serie.length === 0) {
      if (this.silent) this.log('[silent mode] Error. You should first enter a serie!', true);
      else throw new TypeError('Error. You should first enter a serie!')
      return 1
    } else { return 0 }
  };

  /** ensure nbClass is an integer */
  this._nbClassInt = function (nbClass) {
    var nbclassTmp = parseInt(nbClass, 10);
    if (isNaN(nbclassTmp)) {
      if (this.silent) this.log("[silent mode] '" + nbclassTmp + "' is not a valid integer. Enable to set class number.", true);
      else throw new TypeError("'" + nbclassTmp + "' is not a valid integer. Enable to set class number.")
    } else {
      return nbclassTmp
    }
  };

  /** check if the serie contains negative value */
  this._hasNegativeValue = function () {
    for (let i = 0; i < this.serie.length; i++) {
      if (this.serie[i] < 0) { return true }
    }
    return false
  };

  /** check if the serie contains zero value */
  this._hasZeroValue = function () {
    for (let i = 0; i < this.serie.length; i++) {
      if (parseFloat(this.serie[i]) === 0) { return true }
    }
    return false
  };

  /** return sorted values (as array) */
  this.sorted = function () {
    if (this.stat_sorted === null) {
      if (this.is_uniqueValues === false) {
        this.stat_sorted = this.serie.sort(function (a, b) {
          return a - b
        });
      } else {
        this.stat_sorted = this.serie.sort(function (a, b) {
          var nameA = a.toString().toLowerCase(); var nameB = b.toString().toLowerCase();
          if (nameA < nameB) return -1
          if (nameA > nameB) return 1
          return 0
        });
      }
    }

    return this.stat_sorted
  };

  /**
 * Set Manual classification Return an array with bounds : ie array(0,
 * 0.75, 1.5, 2.25, 3);
 * Set ranges and prepare data for displaying legend
 *
 */
  this.setClassManually = function (array) {
    if (this._nodata()) { return }

    if (array[0] !== this.min() || array[array.length - 1] !== this.max()) {
      if (this.silent) this.log('[silent mode] ' + _t('Given bounds may not be correct! please check your input.\nMin value : ' + this.min() + ' / Max value : ' + this.max()), true);
      else throw new TypeError(_t('Given bounds may not be correct! please check your input.\nMin value : ' + this.min() + ' / Max value : ' + this.max()))
      return
    }

    this.setBounds(array);
    this.setRanges();

    // we specify the classification method
    this.method = _t('manual classification') + ' (' + (array.length - 1) + ' ' + _t('classes') + ')';

    return this.bounds
  };

  /**
 * Equal intervals classification Return an array with bounds : ie array(0,
 * 0.75, 1.5, 2.25, 3);
 */
  this.getClassEqInterval = function (nbClass, forceMin, forceMax) {
    nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

    if (this._nodata()) { return }

    var tmpMin = (typeof forceMin === 'undefined') ? this.min() : forceMin;
    var tmpMax = (typeof forceMax === 'undefined') ? this.max() : forceMax;

    var a = [];
    var val = tmpMin;
    var interval = (tmpMax - tmpMin) / nbClass;

    for (let i = 0; i <= nbClass; i++) {
      a[i] = val;
      val += interval;
    }

    // -> Fix last bound to Max of values
    a[nbClass] = tmpMax;

    this.setBounds(a);
    this.setRanges();

    // we specify the classification method
    this.method = _t('eq. intervals') + ' (' + nbClass + ' ' + _t('classes') + ')';

    return this.bounds
  };

  this.getQuantiles = function (nbClass) {
    nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

    var tmp = this.sorted();
    var quantiles = [];

    var step = this.pop() / nbClass;
    for (var i = 1; i < nbClass; i++) {
      var qidx = Math.round(i * step + 0.49);
      quantiles.push(tmp[qidx - 1]); // zero-based
    }

    return quantiles
  };

  /**
 * Quantile classification Return an array with bounds : ie array(0, 0.75,
 * 1.5, 2.25, 3);
 */
  this.getClassQuantile = function (nbClass) {
    nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

    if (this._nodata()) { return }

    var tmp = this.sorted();
    var bounds = this.getQuantiles(nbClass);
    bounds.unshift(tmp[0]);

    if (bounds[tmp.length - 1] !== tmp[tmp.length - 1]) { bounds.push(tmp[tmp.length - 1]); }

    this.setBounds(bounds);
    this.setRanges();

    // we specify the classification method
    this.method = _t('quantile') + ' (' + nbClass + ' ' + _t('classes') + ')';

    return this.bounds
  };

  /**
 * Standard Deviation classification
 * Return an array with bounds : ie array(0,
 * 0.75, 1.5, 2.25, 3);
 */
  this.getClassStdDeviation = function (nbClass, matchBounds) {
    nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

    if (this._nodata()) { return }

    var tmpMax = this.max();
    var tmpMin = this.min();
    var tmpStdDev = this.stddev();
    var tmpMean = this.mean();

    var a = [];

    // number of classes is odd
    if (nbClass % 2 === 1) {
      // Euclidean division to get the inferior bound
      var infBound = Math.floor(nbClass / 2);

      var supBound = infBound + 1;

      // we set the central bounds
      a[infBound] = tmpMean - (tmpStdDev / 2);
      a[supBound] = tmpMean + (tmpStdDev / 2);

      // Values < to infBound, except first one
      for (let i = infBound - 1; i > 0; i--) {
        let val = a[i + 1] - tmpStdDev;
        a[i] = val;
      }

      // Values > to supBound, except last one
      for (let i = supBound + 1; i < nbClass; i++) {
        let val = a[i - 1] + tmpStdDev;
        a[i] = val;
      }

      // number of classes is even
    } else {
      var meanBound = nbClass / 2;

      // we get the mean value
      a[meanBound] = tmpMean;

      // Values < to the mean, except first one
      for (let i = meanBound - 1; i > 0; i--) {
        let val = a[i + 1] - tmpStdDev;
        a[i] = val;
      }

      // Values > to the mean, except last one
      for (let i = meanBound + 1; i < nbClass; i++) {
        let val = a[i - 1] + tmpStdDev;
        a[i] = val;
      }
    }

    // we finally set the first value
    // do we excatly match min value or not ?
    a[0] = (typeof matchBounds === 'undefined') ? a[1] - tmpStdDev : tmpMin;

    // we finally set the last value
    // do we excatly match max value or not ?
    a[nbClass] = (typeof matchBounds === 'undefined') ? a[nbClass - 1] + tmpStdDev : tmpMax;

    this.setBounds(a);
    this.setRanges();

    // we specify the classification method
    this.method = _t('std deviation') + ' (' + nbClass + ' ' + _t('classes') + ')';

    return this.bounds
  };

  /**
 * Geometric Progression classification
 * http://en.wikipedia.org/wiki/Geometric_progression
 * Return an array with bounds : ie array(0,
 * 0.75, 1.5, 2.25, 3);
 */
  this.getClassGeometricProgression = function (nbClass) {
    nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

    if (this._nodata()) { return }

    if (this._hasNegativeValue() || this._hasZeroValue()) {
      if (this.silent) this.log('[silent mode] ' + _t('geometric progression can\'t be applied with a serie containing negative or zero values.'), true);
      else throw new TypeError(_t('geometric progression can\'t be applied with a serie containing negative or zero values.'))
      return
    }

    var a = [];
    var tmpMin = this.min();
    var tmpMax = this.max();

    var logMax = Math.log(tmpMax) / Math.LN10; // max decimal logarithm (or base 10)
    var logMin = Math.log(tmpMin) / Math.LN10; // min decimal logarithm (or base 10)

    var interval = (logMax - logMin) / nbClass;

    // we compute log bounds
    for (let i = 0; i < nbClass; i++) {
      if (i === 0) {
        a[i] = logMin;
      } else {
        a[i] = a[i - 1] + interval;
      }
    }

    // we compute antilog
    a = a.map(function (x) { return Math.pow(10, x) });

    // and we finally add max value
    a.push(this.max());

    this.setBounds(a);
    this.setRanges();

    // we specify the classification method
    this.method = _t('geometric progression') + ' (' + nbClass + ' ' + _t('classes') + ')';

    return this.bounds
  };

  /**
 * Arithmetic Progression classification
 * http://en.wikipedia.org/wiki/Arithmetic_progression
 * Return an array with bounds : ie array(0,
 * 0.75, 1.5, 2.25, 3);
 */
  this.getClassArithmeticProgression = function (nbClass) {
    nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

    if (this._nodata()) { return }

    var denominator = 0;

    // we compute the (french) "Raison"
    for (let i = 1; i <= nbClass; i++) {
      denominator += i;
    }

    var a = [];
    var tmpMin = this.min();
    var tmpMax = this.max();

    var interval = (tmpMax - tmpMin) / denominator;

    for (let i = 0; i <= nbClass; i++) {
      if (i === 0) {
        a[i] = tmpMin;
      } else {
        a[i] = a[i - 1] + (i * interval);
      }
    }

    this.setBounds(a);
    this.setRanges();

    // we specify the classification method
    this.method = _t('arithmetic progression') + ' (' + nbClass + ' ' + _t('classes') + ')';

    return this.bounds
  };

  /**
 * Credits : Doug Curl (javascript) and Daniel J Lewis (python implementation)
 * http://www.arcgis.com/home/item.html?id=0b633ff2f40d412995b8be377211c47b
 * http://danieljlewis.org/2010/06/07/jenks-natural-breaks-algorithm-in-python/
 */
  this.getClassJenks = function (nbClass) {
    nbClass = this._nbClassInt(nbClass); // ensure nbClass is an integer

    if (this._nodata()) { return }

    let dataList = this.sorted();

    // now iterate through the datalist:
    // determine mat1 and mat2
    // really not sure how these 2 different arrays are set - the code for
    // each seems the same!
    // but the effect are 2 different arrays: mat1 and mat2
    var mat1 = [];
    // for (var x = 0, xl = dataList.length + 1; x < xl; x++) {
    for (var x = 0; x < dataList.length + 1; x++) {
      var temp = [];
      for (var j = 0, jl = nbClass + 1; j < jl; j++) {
        temp.push(0);
      }
      mat1.push(temp);
    }

    var mat2 = [];
    // for (var i = 0, il = dataList.length + 1; i < il; i++) {
    for (var i = 0; i < dataList.length + 1; i++) {
      var temp2 = [];
      for (var c = 0, cl = nbClass + 1; c < cl; c++) {
        temp2.push(0);
      }
      mat2.push(temp2);
    }

    // absolutely no idea what this does - best I can tell, it sets the 1st
    // group in the
    // mat1 and mat2 arrays to 1 and 0 respectively
    for (var y = 1, yl = nbClass + 1; y < yl; y++) {
      mat1[0][y] = 1;
      mat2[0][y] = 0;
      for (var t = 1, tl = dataList.length + 1; t < tl; t++) {
        mat2[t][y] = Infinity;
      }
      var v = 0.0;
    }

    // and this part - I'm a little clueless on - but it works
    // pretty sure it iterates across the entire dataset and compares each
    // value to
    // one another to and adjust the indices until you meet the rules:
    // minimum deviation
    // within a class and maximum separation between classes
    for (var l = 2, ll = dataList.length + 1; l < ll; l++) {
      var s1 = 0.0;
      var s2 = 0.0;
      var w = 0.0;
      for (var m = 1, ml = l + 1; m < ml; m++) {
        var i3 = l - m + 1;
        var val = parseFloat(dataList[i3 - 1]);
        s2 += val * val;
        s1 += val;
        w += 1;
        v = s2 - (s1 * s1) / w;
        var i4 = i3 - 1;
        if (i4 !== 0) {
          for (var p = 2, pl = nbClass + 1; p < pl; p++) {
            if (mat2[l][p] >= (v + mat2[i4][p - 1])) {
              mat1[l][p] = i3;
              mat2[l][p] = v + mat2[i4][p - 1];
            }
          }
        }
      }
      mat1[l][1] = 1;
      mat2[l][1] = v;
    }

    var k = dataList.length;
    var kclass = [];

    // fill the kclass (classification) array with zeros:
    for (i = 0; i <= nbClass; i++) {
      kclass.push(0);
    }

    // this is the last number in the array:
    kclass[nbClass] = parseFloat(dataList[dataList.length - 1]);
    // this is the first number - can set to zero, but want to set to lowest
    // to use for legend:
    kclass[0] = parseFloat(dataList[0]);
    var countNum = nbClass;
    while (countNum >= 2) {
      var id = parseInt((mat1[k][countNum]) - 2);
      kclass[countNum - 1] = dataList[id];
      k = parseInt((mat1[k][countNum] - 1));
      // spits out the rank and value of the break values:
      // console.log("id="+id,"rank = " + String(mat1[k][countNum]),"val =
      // " + String(dataList[id]))
      // count down:
      countNum -= 1;
    }
    // check to see if the 0 and 1 in the array are the same - if so, set 0
    // to 0:
    if (kclass[0] === kclass[1]) {
      kclass[0] = 0;
    }

    this.setBounds(kclass);
    this.setRanges();

    this.method = _t('Jenks') + ' (' + nbClass + ' ' + _t('classes') + ')';

    return this.bounds // array of breaks
  };

  /**
 * Quantile classification Return an array with bounds : ie array(0, 0.75,
 * 1.5, 2.25, 3);
 */
  this.getClassUniqueValues = function () {
    if (this._nodata()) { return }

    this.is_uniqueValues = true;
    var tmp = this.sorted(); // display in alphabetical order

    var a = [];

    for (let i = 0; i < this.pop(); i++) {
      if (a.indexOf(tmp[i]) === -1) {
        a.push(tmp[i]);
      }
    }

    this.bounds = a;

    // we specify the classification method
    this.method = _t('unique values');

    return a
  };

  /**
 * Return the class of a given value.
 * For example value : 6
 * and bounds array = (0, 4, 8, 12);
 * Return 2
 */
  this.getClass = function (value) {
    for (let i = 0; i < this.bounds.length; i++) {
      if (this.is_uniqueValues === true) {
        if (value === this.bounds[i]) { return i }
      } else {
      // parseFloat() is necessary
        if (parseFloat(value) <= this.bounds[i + 1]) {
          return i
        }
      }
    }

    return _t("Unable to get value's class.")
  };

  /**
 * Return the ranges array : array('0-0.75', '0.75-1.5', '1.5-2.25',
 * '2.25-3');
 */
  this.getRanges = function () {
    return this.ranges
  };

  /**
 * Returns the number/index of this.ranges that value falls into
 */
  this.getRangeNum = function (value) {
    var bounds, i;

    for (i = 0; i < this.ranges.length; i++) {
      bounds = this.ranges[i].split(/ - /);
      if (value <= parseFloat(bounds[1])) {
        return i
      }
    }
  };

  /*
 * Compute inner ranges based on serie.
 * Produce discontinous ranges used for legend - return an array similar to :
 * array('0.00-0.74', '0.98-1.52', '1.78-2.25', '2.99-3.14');
 * If inner ranges already computed, return array values.
 */
  this.getInnerRanges = function () {
    // if already computed, we return the result
    if (this.inner_ranges != null) {
      return this.inner_ranges
    }

    var a = [];
    var tmp = this.sorted();
    var cnt = 1; // bounds array counter

    for (let i = 0; i < tmp.length; i++) {
      let rangeFirstValue;
      if (i === 0) {
        rangeFirstValue = tmp[i]; // we init first range value
      }

      if (parseFloat(tmp[i]) > parseFloat(this.bounds[cnt])) {
        a[cnt - 1] = '' + rangeFirstValue + this.separator + tmp[i - 1];

        rangeFirstValue = tmp[i];

        cnt++;
      }

      // we reach the last range, we finally complete manually
      // and return the array
      if (cnt === (this.bounds.length - 1)) {
      // we set the last value
        a[cnt - 1] = '' + rangeFirstValue + this.separator + tmp[tmp.length - 1];

        this.inner_ranges = a;
        return this.inner_ranges
      }
    }
  };

  this.getSortedlist = function () {
    return this.sorted().join(', ')
  };

  // object constructor
  // At the end of script. If not setPrecision() method is not known

  // we create an object identifier for debugging
  this.objectID = new Date().getUTCMilliseconds();
  this.log('Creating new geostats object');

  if (typeof a !== 'undefined' && a.length > 0) {
    this.serie = a;
    this.setPrecision();
    this.log('Setting serie (' + a.length + ') : ' + a.join());
  } else {
    this.serie = [];
  }

  // creating aliases on classification function for backward compatibility
  this.getJenks = this.getClassJenks;
  this.getGeometricProgression = this.getClassGeometricProgression;
  this.getEqInterval = this.getClassEqInterval;
  this.getQuantile = this.getClassQuantile;
  this.getStdDeviation = this.getClassStdDeviation;
  this.getUniqueValues = this.getClassUniqueValues;
  this.getArithmeticProgression = this.getClassArithmeticProgression;
}

function bin (data, binInstructions) {
  if (binInstructions.constructor === Object) {
    const intervalBounds = getIntervalBounds(data, binInstructions);
    const ranges = pairRanges(intervalBounds);

    return bin1d(data, binInstructions.groupBy, ranges)
  }

  if (binInstructions.constructor === Array) {
    const intervalBoundsPerVariable = binInstructions.map(instructions => getIntervalBounds(data, instructions));
    const rangesPerVariable = intervalBoundsPerVariable.map(bounds => pairRanges(bounds));
    const variables = binInstructions.map(instructions => instructions.groupBy);

    return binKd(data, variables, rangesPerVariable)
  }
}

function getIntervalBounds (data, binInstructions) {
  const { groupBy, method, numClasses } = parseBinInstructions(binInstructions);

  const variableData = data[groupBy];
  if (!variableData) {
    throw new Error(`groupBy column '${groupBy}' does not exist`)
  }

  if (method === 'IntervalSize') {
    return createRangesFromBinSize(variableData, binInstructions.binSize)
  }

  if (method === 'Manual') {
    return binInstructions.manualClasses
  }

  const geoStat = new Geostats(variableData);
  return geoStat[methodMap[method]](numClasses)
}

function parseBinInstructions (binInstructions) {
  if (binInstructions.constructor !== Object) {
    throw new Error('Bin only accepts an Object')
  }

  const groupBy = binInstructions.groupBy;
  if (groupBy.constructor !== String) {
    throw new Error('groupBy only accepts a String variable name')
  }

  let method = binInstructions.method;
  if (!method) {
    warn('No binning method specified, defaulting to EqualInterval');
    method = 'EqualInterval';
  }
  if (method.constructor !== String) {
    warn('Binning method not recognized, defaulting to EqualInterval');
    method = 'EqualInterval';
  }

  let numClasses = binInstructions.numClasses;
  if (!numClasses) {
    warn('numClasses not specified, defaulting to 5');
    numClasses = 5;
  }

  return { groupBy, method, numClasses }
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

const methodMap = {
  EqualInterval: 'getClassEqInterval',
  StandardDeviation: 'getClassStdDeviation',
  ArithmeticProgression: 'getClassArithmeticProgression',
  GeometricProgression: 'getClassGeometricProgression',
  Quantile: 'getClassQuantile',
  Jenks: 'getClassJenks'
};

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

const methods$1 = {
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
  Object.assign(targetClass.prototype, methods$1);
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

function ensureRowExists (key, self) {
  if (isUndefined(self._keyToRowNumber[key])) {
    throw new Error(`Key '${key}' not found`)
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

const methods$2 = {
  // Rows
  addRow (row) {
    ensureValidRow(row, this);

    for (const columnName in row) {
      const value = row[columnName];
      this._data[columnName].push(value);

      this._updateDomainIfNecessary(columnName, value);
    }

    const rowNumber = getDataLength(this._data) - 1;
    const keyDomain = this.domain('$key');
    keyDomain[1]++;
    const key = keyDomain[1];

    this._data.$key.push(key);
    this._keyToRowNumber[key] = rowNumber;
  },

  updateRow (key, row) {
    if (row.constructor === Function) {
      const result = row(this.row(key));

      if (!(result && result.constructor === Object)) {
        throw new Error('updateRow function must return Object')
      }

      this.updateRow(key, result);
    }

    ensureRowExists(key, this);
    ensureValidRowUpdate(row, this);

    const rowNumber = this._keyToRowNumber[key];

    for (const columnName in row) {
      throwErrorIfColumnIsKey(columnName);

      const value = row[columnName];
      this._data[columnName][rowNumber] = value;

      this._resetDomainIfNecessary(columnName);
    }
  },

  deleteRow (key) {
    ensureRowExists(key, this);

    const rowNumber = this._keyToRowNumber[key];
    delete this._keyToRowNumber[key];

    for (const columnName in this._data) {
      this._data[columnName].splice(rowNumber, 1);
      this._resetDomainIfNecessary(columnName);
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
  Object.assign(targetClass.prototype, methods$2);
}

function throwErrorIfColumnIsKey (columnName) {
  if (columnName === '$key') throw new Error('Cannot modify key column')
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

class DataContainer {
  constructor (data, options = { validate: true }) {
    this._data = {};
    this._keyToRowNumber = {};
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

  row (key) {
    const rowNumber = this._keyToRowNumber[key];
    return this._row(rowNumber)
  }

  prevRow (key) {
    const rowNumber = this._keyToRowNumber[key];
    const previousRowNumber = rowNumber - 1;
    return this._row(previousRowNumber)
  }

  nextRow (key) {
    const rowNumber = this._keyToRowNumber[key];
    const nextRowNumber = rowNumber + 1;
    return this._row(nextRowNumber)
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
  _row (rowNumber) {
    const length = getDataLength(this._data);

    if (rowNumber < 0 || rowNumber >= length) {
      return undefined
    }

    const row = {};

    for (const columnName in this._data) {
      const value = this._data[columnName][rowNumber];
      row[columnName] = value;
    }

    return row
  }
}

dataLoadingMixin(DataContainer);
transformationsMixin(DataContainer);
modifyingRowsAndColumnsMixin(DataContainer);

const invalidDataError = new Error('Data passed to DataContainer is of unknown format');

module.exports = DataContainer;
