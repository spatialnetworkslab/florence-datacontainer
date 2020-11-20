import { getIntervalBounds } from './transformations/bin.js'
import { scaleThreshold } from 'd3-scale'

const methods = {
  bounds (binInstructions) {
    if (this.type(binInstructions.column) !== 'quantitative') {
      throw new Error('Column should be of type \'quantitative\'')
    }

    const bounds = getIntervalBounds(
      this._data,
      binInstructions
    )

    return bounds.slice(1, bounds.length - 1)
  },

  classify (binInstructions, range) {
    const bounds = this.bounds(binInstructions)

    return scaleThreshold()
      .domain(bounds)
      .range(range)
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
