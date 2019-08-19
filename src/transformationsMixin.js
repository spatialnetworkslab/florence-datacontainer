import transformations from './transformations'

const methods = {
  arrange (sortInstructions) {
    this._data = transformations.arrange(this._data, sortInstructions)
    return this
  },

  bin (binInstructions) {
    this._data = transformations.bin(this._data, binInstructions)
    return this
  },

  cumsum (cumsumInstructions) {
    this._data = transformations.cumsum(this._data, cumsumInstructions)
    return this
  },

  dropNA (dropInstructions) {
    this._data = transformations.dropNA(this._data, dropInstructions)
    return this
  },

  filter (filterFunction) {
    this._data = transformations.filter(this._data, filterFunction)
    return this
  },

  groupBy (groupByInstructions) {
    this._data = transformations.groupBy(this._data, groupByInstructions)
    return this
  },

  mutarise (mutariseInstructions) {
    this._data = transformations.mutarise(this._data, mutariseInstructions)
    return this
  },

  mutarize (mutariseInstructions) {
    this._data = transformations.mutarise(this._data, mutariseInstructions)
    return this
  },

  mutate (mutateInstructions) {
    this._data = transformations.mutate(this._data, mutateInstructions)
    return this
  },

  transmute (transmuteInstructions) {
    this._data = transformations.transmute(this._data, transmuteInstructions)
    return this
  },

  rename (renameInstructions) {
    this._data = transformations.rename(this._data, renameInstructions)
    return this
  },

  reproject (reprojectInstructions) {
    this._data = transformations.reproject(this._data, reprojectInstructions)
    return this
  },

  select (selection) {
    this._data = transformations.select(this._data, selection)
    return this
  },

  summarise (summariseInstructions) {
    this._data = transformations.summarise(this._data, summariseInstructions)
    return this
  },

  summarize (summariseInstructions) {
    this._data = transformations.summarise(this._data, summariseInstructions)
    return this
  },

  transform (transformFunction) {
    this._data = transformations.transform(this._data, transformFunction)
    return this
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
