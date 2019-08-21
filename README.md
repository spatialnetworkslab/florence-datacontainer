# Florence DataContainer

A powerful yet light-weight interface to manage data. Designed to be used with [florence](https://github.com/spatialnetworkslab/florence).

## API Reference

* [Loading data](#loading-data)
* [Options](#options)
* [Accessing data](#accessing-data)
* [Domains and types](#domains-and-types)
* [Checks](#checks)
* [Transformations](#transformations)
* [Adding and removing rows](#adding-and-removing-rows)

### Loading data

Loading data to `DataContainer` is done by passing a supported data structure as first argument to the `DataContainer` constructor:

```js
const dataContainer = new DataContainer(supportedDataStructure)
```

`DataContainer` currently supports 3 data structures:

- Column-oriented data
- Row-oriented data
- GeoJSON

More structures might be supported in the future.
`DataContainer` internally stores data in a [column-oriented](https://www.kdnuggets.com/2017/02/apache-arrow-parquet-columnar-data.html) format.
This means that loading column-oriented data will be slightly faster than row-oriented data.

`DataContainer` supports 6 data types. These data types correspond to native JS data types/structures (see table below).

|  Data type   |                                          JS equivalent                                           |        Loadable         | Column name |
| ------------ | ------------------------------------------------------------------------------------------------ | ----------------------- | ----------- |
| quantitative | `Number`                                                                                         | yes                     | NA          |
| categorical  | `String`                                                                                         | yes                     | NA          |
| temporal     | `Date`                                                                                           | yes                     | NA          |
| interval     | `Array` of two `Number`s                                                                         | yes                     | NA          |
| geometry     | [GeoJSON geometry](https://tools.ietf.org/html/rfc7946#appendix-A) (except `GeometryCollection`) | only by loading GeoJSON | `$geometry` |
| grouped      | `DataContainer`                                                                                  | No                      | `$grouped`  |

Data of the types quantitative, categorical, temporal and interval are 'loadable', which means that they can be passed 
in either column-oriented or row-oriented format to the `DataContainer` constructor. 
Geometry data can only be loaded from [GeoJSON](#loading-geojson-data).
Geometry data can only exists in a column called `$geometry`.
Grouped data is not loadable: it can only be generated by using `.groupBy` or `.bin` transformations (see [Transformations](#transformations)).
A column of grouped data is just a column of other `DataContainer`s.
Grouped data can only exist in a column called `$grouped`.

#### Loading column- and row-oriented data

```js
// Column-oriented data
const columnOriented = new DataContainer({
  fruit: ['apple', 'banana', 'coconut', 'durian'],
  amount: [1, 2, 3, 4]
})

// Row-oriented data
const rowOriented = new DataContainer([
  { fruit: 'apple', amount: 1 },
  { fruit: 'banana', amount: 2 },
  { fruit: 'coconut', amount: 3 },
  { fruit: 'durian', amount: 4 }
])

const s = JSON.stringify

s(columnOriented.column('fruit')) === s(rowOriented.column('fruit')) // true
s(columnOriented.column('amount')) === s(rowOriented.column('amount')) // true

```

#### Loading GeoJSON data

When loading [GeoJSON FeatureCollection](https://tools.ietf.org/html/rfc7946#section-1.5)s, the geometry data will end up in a
column called `$geometry`:

```js
const geojson = new DataContainer({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point', coordinates: [0, 0]
      },
      properties: {
        fruit: 'apple', amount: 1
      }
    }
  ]
})

geojson.column('$geometry') // [{ type: 'Point', coordinates: [0, 0] }]
geojson.column('fruit') // ['apple']

```

### Options

The `DataContainer` constructor takes a second argument, which is an optional object of options:

```js
const dataContainer = new DataContainer(data, { validate: true })
```

| Option name | Default value |  Type   |
| ----------- | ------------- | ------- |
| validate    | `true`        | Boolean |

Setting the `validate` option to `false` will disable column validation. This can save a bit of time
when you are certain your data is completely valid (i.e. all columns have only one data type and contain
at least one valid that is not `NaN`, `undefined`, `null`, or `Infinity`) or don't care if it is.
More options might be added in the future.

### Accessing data

<a name="datacontainer_data" href="#datacontainer_data">#</a> <i>DataContainer</i>.<b>data</b>()

Returns whatever data is currently loaded to the `DataContainer` in a column-oriented format.

```js
const dataContainer = new DataContainer([
  { fruit: 'apple', amount: 1 },
  { fruit: 'banana', amount: 2 }
])

dataContainer.data() // { fruit: ['apple', 'banana'], amount: [1, 2], $key: [0, 1] }
```

<a name="datacontainer_row" href="#datacontainer_row">#</a> <i>DataContainer</i>.<b>row</b>(key)

Returns an object representing a row.

```js
const dataContainer = new DataContainer({ fruit: ['apple', 'banana'], amount: [1, 2] })
dataContainer.row(0) // { fruit: 'apple', amount: 1, $key: 0 }
```

<a name="datacontainer_prevrow" href="#datacontainer_prevrow">#</a> <i>DataContainer</i>.<b>prevRow</b>(key)

Returns the previous row.

```js
const dataContainer = new DataContainer({ fruit: ['apple', 'banana'], amount: [1, 2] })
dataContainer.prevRow(1) // { fruit: 'apple', amount: 1, $key: 0 }
```

<a name="datacontainer_nextrow" href="#datacontainer_nextrow">#</a> <i>DataContainer</i>.<b>nextRow</b>(key)

Returns the next row.

```js
const dataContainer = new DataContainer({ fruit: ['apple', 'banana'], amount: [1, 2] })
dataContainer.nextRow(0) // { fruit: 'banana', amount: 2, $key: 1 }
```

<a name="datacontainer_rows" href="#datacontainer_rows">#</a> <i>DataContainer</i>.<b>rows</b>()

Returns an `Array` of rows.

```js
const dataContainer = new DataContainer({ fruit: ['apple', 'banana'], amount: [1, 2] })
dataContainer.rows() 
/* [
 *   { fruit: 'apple', amount: 1, $key: 0 },
 *   { fruit: 'banana', amount: 2, $key: 1 },
 * ] 
 */
```

<a name="datacontainer_column" href="#datacontainer_column">#</a> <i>DataContainer</i>.<b>column</b>(columnName)

Returns a column as an `Array`.

```js
const dataContainer = new DataContainer({ fruit: ['apple', 'banana'], amount: [1, 2] })
dataContainer.column('fruit') // ['apple', 'banana']
dataContainer.column('$key') // [0, 1]
```

<a name="datacontainer_map" href="#datacontainer_map">#</a> <i>DataContainer</i>.<b>map</b>(columnName, func)

Equivalent to `.column(columnName).map(func)`

### Domains and types

<a name="datacontainer_domain" href="#datacontainer_domain">#</a> <i>DataContainer</i>.<b>domain</b>(columnName)

Returns the domain of a column.

```js
const dataContainer = new DataContainer({
  fruit: ['apple', 'banana', 'apple', 'banana'],
  quantity: [1, 2, 3, 4],
  dayOfSale: [new Date(2019, 4, 3), new Date(2019, 4, 4), new Date(2019, 4, 5), new Date(2019, 4, 6)]
})

dataContainer.domain('fruit') // ['apple', 'banana']
dataContainer.domain('quantity') // [1, 4]
dataContainer.domain('dayOfSale') // [Date Fri May 03 2019 ..., Date Mon May 06 2019 ...]
```

For geometry data, this will return the bounding box.

<a name="datacontainer_type" href="#datacontainer_type">#</a> <i>DataContainer</i>.<b>type</b>(columnName)

Returns the type of a column.

```js
const dataContainer = new DataContainer({
  fruit: ['apple', 'banana', 'apple', 'banana'],
  quantity: [1, 2, 3, 4],
  dayOfSale: [new Date(2019, 4, 3), new Date(2019, 4, 4), new Date(2019, 4, 5), new Date(2019, 4, 6)]
})

dataContainer.type('fruit') // categorical
dataContainer.type('quantity') // quantitative
dataContainer.type('dayOfScale') // temporal
```

### Checks

Some convenience functions to check data during development.

<a name="datacontainer_hascolumn" href="#datacontainer_hascolumn">#</a> <i>DataContainer</i>.<b>hasColumn</b>(columnName)

Check if the `DataContainer` has a column.

```js
const dataContainer = new DataContainer({ a: [1, 2, 3, 4] })
dataContainer.hasColumn('a') // true
dataContainer.hasColumn('b') // false
```

<a name="datacontainer_columnisvalid" href="#datacontainer_columnisvalid">#</a> <i>DataContainer</i>.<b>columnIsValid</b>(columnName)

Check if a column is valid.

```js
const dataContainer = new DataContainer({ a: [1, NaN, 3] })
  .mutate({ b: () => NaN })

dataContainer.columnIsValid('a') // true
dataContainer.columnIsValid('b') // false
```

<a name="datacontainer_validatecolumn" href="#datacontainer_validatecolumn">#</a> <i>DataContainer</i>.<b>validateColumn</b>(columnName)

Similar to `columnIsValid`, but throws an error if a column is invalid, instead of returning `false`.
, 
```js
const dataContainer = new DataContainer({ a: [1, NaN, 3] })
  .mutate({ b: () => NaN })

dataContainer.validateColumn('a') // nothing happens
dataContainer.validateColumn('b') // throws error
```

<a name="datacontainer_validateallcolumns" href="#datacontainer_validateallcolumns">#</a> <i>DataContainer</i>.<b>validateAllColumns</b>()

When data is first loaded to the `DataContainer`, `validateAllColumns` is ran by default.
To avoid wasting time on checks after every subsequent transformation, it is not ran after that.
If you want `DataContainer` to throw an error if any data has somehow become invalid, you can call this method manually.
Invalid here means that they contain mixed types, or only have invalid data like `NaN`.

### Transformations

`DataContainer`'s transformations are heavily inspired by R's [dplyr](https://dplyr.tidyverse.org/) 
(part of the [tidyverse](https://www.tidyverse.org/)). All transformations will return a new `DataContainer`. For transformations
where it makes sense like `filter`, [immer](https://github.com/immerjs/immer) is used to avoid unnecessary deep cloning while still allowing subsequent transformations without modifying the original data.

<a name="datacontainer_select" href="#datacontainer_select">#</a> <i>DataContainer</i>.<b>select</b>(selectInstructions)

`select` returns a `DataContainer` with only the columns specified in `selectInstructions`. `selectInstructions` can be a single `String` column name, or an `Array` of column names.

```js
const dataContainer = new DataContainer({
  fruit: ['apple', 'banana'],
  quantity: [1, 2],
  dayOfSale: [new Date(2019, 4, 3), new Date(2019, 4, 4)]
})

const withoutDayOfSale = dataContainer.select(['fruit', 'quantity'])
withoutDayOfSale.data() // { fruit: ['apple', 'banana'], quantity: [1, 2], $key: [0, 1] }
```

<a name="datacontainer_rename" href="#datacontainer_rename">#</a> <i>DataContainer</i>.<b>rename</b>(renameInstructions)

`rename` is used to rename columns. `renameInstructions` must be an object with current column names as keys, and desired new column names as values.

```js
const dataContainer = new DataContainer({ f: ['apple', 'banana'], a: [1, 2] })
const renamed = dataContainer.rename({ f: 'fruit', a: 'amount' })
renamed.column('fruit') // ['apple', 'banana']
```

<a name="datacontainer_filter" href="#datacontainer_filter">#</a> <i>DataContainer</i>.<b>filter</b>(filterFunction)

`filter` will throw away all rows that do not satisfy the condition expressed in the `filterFunction`.

```js
const dataContainer = new DataContainer({ fruit: ['apple', 'banana'], amount: [1, 2] })
dataContainer.filter(row => row.fruit !== 'banana').data() // { fruit: ['apple'], amount: [1] }
```

<a name="datacontainer_dropna" href="#datacontainer_dropna">#</a> <i>DataContainer</i>.<b>dropNA</b>(dropNAInstructions)

`dropNA` is essentially a special case of `filter` that disposes of invalid values like `NaN`, `null` or `undefined`.
`dropNAInstructions` can be 

- nothing or something else that's falsy, in which case it will dispose of all rows in all columns that contain invalid values
- a `String` value with a column name. All rows that have invalid values in this column will be removed
- an `Array` of column names (`String`s). All rows that have invalid values in any of these columns will be removed

```js
const dataContainer = new DataContainer(
  { a: [1, 2, undefined, 4], b: [5, null, 7, 8], c: [NaN, 10, 11, 12] }
)

dataContainer.dropNA().data() // { a: [4], b: [8], c: [12], $key: [3] }
dataContainer.dropNA(['a', 'b']).data() // { a: [1, 4], b: [5, 8], c: [NaN, 12], $key: [0, 3] }
```

<a name="datacontainer_arrange" href="#datacontainer_arrange">#</a> <i>DataContainer</i>.<b>arrange</b>(arrangeInstructions)

`arrange` is used to sort data. `arrangeInstructions` can be an

- `Object`, with exactly one key (the column by which to sort) and one value 
(how to sort it, either `'ascending'`, `'descending`' or a [compareFunction](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Description))
- `Array`, containing `Object`s as described in the line above

```js
const dataContainer = new DataContainer({
  fruit: ['apple', 'banana', 'coconut' 'durian', 'coconut', 'banana'],
  amount: [4, 3, 7, 2, 4, 5]
})

const arranged = dataContainer.arrange([ { fruit: 'descending' }, { amount: 'ascending' } ])
arranged.data()
/* {
 *   fruit: ['durian', 'coconut', 'coconut', 'banana', 'banana', 'apple']
 *   value: [2, 4, 7, 3, 5, 4],
 *   $key: [3, 4, 2, 1, 5, 0]
 * } */
```

<a name="datacontainer_mutate" href="#datacontainer_mutate">#</a> <i>DataContainer</i>.<b>mutate</b>(mutateInstructions)

`mutate` can be used to generate a new column based on existing rows.
`mutateInstructions` must be an object with new column names as keys, and functions showing how to calculate the new column as values.

```js
const dataContainer = new DataContainer({ a: [1, 2, 3, 4 ]})
const dataContainerWithASquared = dataContainer.mutate({ aSquared: row => row.a * row.a })
dataContainerWithASquared.column('aSquared') // [1, 4, 9, 16]
```

<a name="datacontainer_transmute" href="#datacontainer_transmute">#</a> <i>DataContainer</i>.<b>transmute</b>(mutateInstructions)

Same as `mutate`, except that it removes all the old columns.

<a name="datacontainer_groupby" href="#datacontainer_groupby">#</a> <i>DataContainer</i>.<b>groupBy</b>(groupByInstructions)

Used to split up a `DataContainer` in several `DataContainer`s based on different categories.
`groupByInstructions` can be a `String` containing a single column name, or an `Array` containing multiple column names.

```js
const dataContainer = new DataContainer(
  { fruit: ['apple', 'banana', 'banana', 'apple'], amount: [10, 5, 13, 9] }
)

const grouped = dataContainer.groupBy('fruit')
grouped.column('fruit') // ['apple', 'banana']
grouped.column('$grouped') // [<DataContainer>, <DataContainer>]
grouped.map('$grouped', group => group.column('amount')) // [[10, 9], [5, 13]]
```

<a name="datacontainer_bin" href="#datacontainer_bin">#</a> <i>DataContainer</i>.<b>bin</b>(binInstructions)

Used to split up a `DataContainer` in several `DataContainers` based on classification of quantitative data.

```js
const dataContainer = new DataContainer(
  { a: [1, 2, 3, 4, 5, 6, 7], b: [8, 9, 10, 11, 12, 13, 14] }
)

const binned = dataContainer.bin({ groupBy: 'a', method: 'EqualInterval', numClasses: 3 })
binned.column('bins') // [[1, 3], [3, 5], [5, 7]]
binned.type('bins') // 'interval'
binned.row(1).$grouped.rows() // [{ a: 3, b: 10, $key: 2 }, { a: 4, b: 11, $key: 3 }]
```

Besides `'EqualInterval'`, other methods of classification are supported. Different methods might require different additional
keys to be passed to `binInstructions`. See the table below for an overview.

|       Class. method       |   option name   | default for option |
| ------------------------- | --------------- | ------------------ |
| `'EqualInterval'`         | `numClasses`    | `5`                |
| `'StandardDeviation'`     | `numClasses`    | `5`                |
| `'ArithmeticProgression'` | `numClasses`    | `5`                |
| `'GeometricProgression'`  | `numClasses`    | `5`                |
| `'Quantile'`              | `numClasses`    | `5`                |
| `'Jenks'`                 | `numClasses`    | `5`                |
| `'IntervalSize'`          | `binSize`       | `1`                |
| `'Manual'`                | `manualClasses` | `undefined`        |

For `'Manual'`, `manualClasses` is required and must be an Array of `interval`s, which will become the bins.
The classification is performed internally by [geostats](https://github.com/simogeo/geostats).

<a name="datacontainer_summarise" href="#datacontainer_summarise">#</a> <i>DataContainer</i>.<b>summarise</b>(summariseInstructions)

Used to summarise columns. You can also use `summarize` if you prefer. `summariseInstructions` must be an Object with new column 
names as keys, and `columnInstruction` `Object`s as values. These `columnInstruction`s must have the name of the column
that is to be summarised as key, and the `summaryMethod` as value.
When applying `summarise` to a grouped `DataContainer`, the summaries of the groups will be taken.

```js
const dataContainer = new DataContainer({ a: [1, 2, 3, 4], b: ['a', 'b', 'a', 'b'] })
const grouped = dataContainer.groupBy('b')

dataContainer.summarise({ mean_a: { a: 'mean' }}).data() // { mean_a: [2.5], $key: [0] }
grouped.summarise({ mean_a: { a: 'mean' } }).data() // { b: ['a', 'b'], mean_a: [2, 3], $key: [0, 1] }
```

The following `summaryMethod`s are available:

- count
- sum
- mean
- median
- mode
- min
- max

It also possible to create your own `summaryMethod` by providing a function that receives the requested column as first argument,
and returns a value that's either quantitative, categorical, temporal or an interval.

<a name="datacontainer_mutarise" href="#datacontainer_mutarise">#</a> <i>DataContainer</i>.<b>mutarise</b>(mutariseInstructions)

`mutarise` (or `mutarize`) is similar to `summarise`, but instead of collapsing the data to a single row, the summarised value
will be added as a new column.

```js
const dataContainer = new DataContainer({ a: [1, 2, 3, 4], b: ['a', 'b', 'a', 'b'] })
const mutarised = dataContainer.groupBy('b').mutarise({ mean_a: { a: 'mean' } })
mutarised.column('a') // [1, 2, 3, 4]
mutarised.column('mean_a') // [2, 3, 2, 3]
```

<a name="datacontainer_transform" href="#datacontainer_transform">#</a> <i>DataContainer</i>.<b>transform</b>(transformFunction)

Used for arbitrary transformations on the data. `transformFunction` receives an `Object` with all the columns currently loaded, 
which must be modified in-place (i.e. `transformFunction` must return void).

```js
const dataContainer = new DataContainer({ a: [1, 2, 3, 4] })
const transformed = dataContainer.transform(columns => {
  columns.b = columns.a.map(a => a ** 2)
})

transformed.column('b') // [1, 4, 9, 16]
```

<a name="datacontainer_reproject" href="#datacontainer_reproject">#</a> <i>DataContainer</i>.<b>reproject</b>(reprojectFunction)

Used to reproject data in the `$geometry` column. Can only be used when a `$geometry` column is present.
`reprojectFunction` should be a function that accepts an `Array` of two `Number`s and returns an `Array` of two `Number`s.
Particularly convenient to use with [proj4](https://github.com/proj4js/proj4js):

```js
const reprojectFunction = proj4('EPSG:4326', 'EPSG:3857').forward
const dataContainer = new DataContainer(geojson).reproject(reprojectFunction)
```

### Adding and removing rows

All of these functions work in-place.

<a name="datacontainer_addrow" href="#datacontainer_addrow">#</a> <i>DataContainer</i>.<b>addRow</b>(row)

Adds a new row to the `DataContainer`. `row` must be an object with one key for every column.

```js
const dataContainer = new DataContainer({ a: [1, 2, 3], b: ['a', 'b', 'c'] })
dataContainer.addRow({ a: 4, b: 'd' })
dataContainer.column('b') // ['a', 'b', 'c', 'd']
```

<a name="datacontainer_updaterow" href="#datacontainer_updaterow">#</a> <i>DataContainer</i>.<b>updateRow</b>(key, row)

Updates an existing row.

```js
const dataContainer = new DataContainer({ a: [1, 2, 3], b: ['a', 'b', 'c'] })
dataContainer.updateRow(2, { a: 100, b: 'fff' })
dataContainer.column('a') // [1, 2, 100]
```

<a name="datacontainer_deleterow" href="#datacontainer_deleterow">#</a> <i>DataContainer</i>.<b>deleteRow</b>(key)

Deletes an existing row,

```js
const dataContainer = new DataContainer({ a: [1, 2, 3], b: ['a', 'b', 'c'] })
dataContainer.deleteRow(2)
dataContainer.column('a') // [1, 2]
```