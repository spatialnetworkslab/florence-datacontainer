import transformations from './transformations'
import DataContainer from './index.js'

const methods = {
  arrange (sortInstructions) {
    const data = transformations.arrange(this._data, sortInstructions)
    return new DataContainer(data, { validate: false })
  },

  bin (binInstructions) {
    const data = transformations.bin(this._data, binInstructions)
    return new DataContainer(data, { validate: false })
  },

  cumsum (cumsumInstructions) {
    const data = transformations.cumsum(this._data, cumsumInstructions)
    return new DataContainer(data, { validate: false })
  },

  dropNA (dropInstructions) {
    const data = transformations.dropNA(this._data, dropInstructions)
    return new DataContainer(data, { validate: false })
  },

  filter (filterFunction) {
    const data = transformations.filter(this._data, filterFunction)
    return new DataContainer(data, { validate: false })
  },

  groupBy (groupByInstructions) {
    const data = transformations.groupBy(this._data, groupByInstructions)
    return new DataContainer(data, { validate: false })
  },

  mutarise (mutariseInstructions) {
    const data = transformations.mutarise(this._data, mutariseInstructions)
    return new DataContainer(data, { validate: false })
  },

  mutarize (mutariseInstructions) {
    const data = transformations.mutarise(this._data, mutariseInstructions)
    return new DataContainer(data, { validate: false })
  },

  mutate (mutateInstructions) {
    const data = transformations.mutate(this._data, mutateInstructions)
    return new DataContainer(data, { validate: false })
  },

  transmute (transmuteInstructions) {
    const data = transformations.transmute(this._data, transmuteInstructions)
    return new DataContainer(data, { validate: false })
  },

  rename (renameInstructions) {
    const data = transformations.rename(this._data, renameInstructions)
    return new DataContainer(data, { validate: false })
  },

  reproject (reprojectInstructions) {
    const data = transformations.reproject(this._data, reprojectInstructions)
    return new DataContainer(data, { validate: false })
  },

  select (selection) {
    const data = transformations.select(this._data, selection)
    return new DataContainer(data, { validate: false })
  },

  summarise (summariseInstructions) {
    const data = transformations.summarise(this._data, summariseInstructions)
    return new DataContainer(data, { validate: false })
  },

  summarize (summariseInstructions) {
    const data = transformations.summarise(this._data, summariseInstructions)
    return new DataContainer(data, { validate: false })
  },

  transform (transformFunction) {
    const data = transformations.transform(this._data, transformFunction)
    return new DataContainer(data, { validate: false })
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
