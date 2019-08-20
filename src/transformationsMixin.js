import produce from 'immer'
import transformations from './transformations'
import DataContainer from './index.js'

const methods = {
  arrange (sortInstructions) {
    const data = transformations.arrange(this._data, sortInstructions)
    return this._handleTransformation(data)
  },

  bin (binInstructions) {
    const data = transformations.bin(this._data, binInstructions)
    return this._handleTransformation(data)
  },

  cumsum (cumsumInstructions) {
    const data = transformations.cumsum(this._data, cumsumInstructions)
    return this._handleTransformation(data)
  },

  dropNA (dropInstructions) {
    const data = transformations.dropNA(this._data, dropInstructions)
    return this._handleTransformation(data)
  },

  filter (filterFunction) {
    const data = transformations.filter(this._data, filterFunction)
    return this._handleTransformation(data)
  },

  groupBy (groupByInstructions) {
    const data = transformations.groupBy(this._data, groupByInstructions)
    return this._handleTransformation(data)
  },

  mutarise (mutariseInstructions) {
    const data = transformations.mutarise(this._data, mutariseInstructions)
    return this._handleTransformation(data)
  },

  mutarize (mutariseInstructions) {
    const data = transformations.mutarise(this._data, mutariseInstructions)
    return this._handleTransformation(data)
  },

  mutate (mutateInstructions) {
    const data = transformations.mutate(this._data, mutateInstructions)
    return this._handleTransformation(data)
  },

  transmute (transmuteInstructions) {
    const data = transformations.transmute(this._data, transmuteInstructions)
    return this._handleTransformation(data)
  },

  rename (renameInstructions) {
    const data = transformations.rename(this._data, renameInstructions)
    return this._handleTransformation(data)
  },

  reproject (reprojectInstructions) {
    const data = transformations.reproject(this._data, reprojectInstructions)
    return this._handleTransformation(data)
  },

  select (selection) {
    const data = transformations.select(this._data, selection)
    return this._handleTransformation(data)
  },

  summarise (summariseInstructions) {
    const data = transformations.summarise(this._data, summariseInstructions)
    return this._handleTransformation(data)
  },

  summarize (summariseInstructions) {
    const data = transformations.summarise(this._data, summariseInstructions)
    return this._handleTransformation(data)
  },

  transform (transformFunction) {
    const data = transformations.transform(this._data, transformFunction)
    return this._handleTransformation(data)
  },

  _handleTransformation (data) {
    if ('$key' in data) {
      const key = data.$key
      data = produce(data, draft => {
        delete draft.$key
      })

      return new DataContainer(data, { key, validate: false })
    } else {
      return new DataContainer(data, { validate: false })
    }
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
