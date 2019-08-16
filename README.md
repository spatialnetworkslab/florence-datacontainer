# Florence DataContainer

A light-weight container to manage client-side data.

## API Reference

* [Loading data](#loading-data)
* [Accessing data](#accessing-data)
* [Data validation](#data-validation)
* [Transformations](#transformations)
* [Adding and removing rows](#adding-and-removing-rows)]

### Loading data

`DataContainer` currently supports 3 data types:

- Column-oriented data
- Row-oriented data
- GeoJSON

More types might be supported in the future.
`DataContainer` internally stores data in a [column-oriented](https://www.kdnuggets.com/2017/02/apache-arrow-parquet-columnar-data.html) format.
This means that loading column-oriented data will be faster than row-oriented data.

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

### Accessing data

<a name="datacontainer_data" href="#datacontainer_data">#</a> <i>DataContainer</i>.<b>data</b>()

Returns whatever data is currently loaded to the `DataContainer` in a column-oriented format.

```js
// TODO
```

<a name="datacontainer_row" href="#datacontainer_row">#</a> <i>DataContainer</i>.<b>row</b>(key)

Returns an object representing a row.

```js
// TODO
```

<a name="datacontainer_rows" href="#datacontainer_rows">#</a> <i>DataContainer</i>.<b>rows</b>()

Returns an Array of rows.

```js
// TODO
```

<a name="datacontainer_column" href="#datacontainer_column">#</a> <i>DataContainer</i>.<b>column</b>(columnPath)

Bla

```js
// TODO
```

<a name="datacontainer_map" href="#datacontainer_map">#</a> <i>DataContainer</i>.<b>map</b>(columnPath)

### Data validation

### Transformations

### Adding and removing rows

## Roadmap