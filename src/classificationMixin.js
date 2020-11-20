import { getIntervalBounds } from './transformations/bin.js'
import { scaleThreshold } from 'd3-scale'

const methods = {
  bounds (binInstructions) {
    const bounds = this.fullBounds(binInstructions)
    return bounds.slice(1, bounds.length - 1)
  },

  fullBounds (binInstructions) {
    if (this.type(binInstructions.column) !== 'quantitative') {
      throw new Error('Column should be of type \'quantitative\'')
    }

    const bounds = getIntervalBounds(
      this._data,
      binInstructions
    )

    return bounds
  },

  boundRanges (binInstructions) {
    const bounds = this.fullBounds(binInstructions)
    const boundRanges = []

    for (let i = 0; i < bounds.length - 1; i++) {
      boundRanges.push([bounds[i], bounds[i + 1]])
    }

    return boundRanges
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
