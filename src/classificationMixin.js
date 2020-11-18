import { getIntervalBounds } from './transformations/bin.js'
import { scaleTreshold } from 'd3-scale'
import { schemeBlues } from 'd3-scale-chromatic'

const methods = {
  bounds (binInstructions) {
    const bounds = getIntervalBounds(
      this._data,
      binInstructions
    )

    return bounds.slice(1, bounds.length - 1)
  },

  classify (binInstructions, colorScheme = schemeBlues) {
    const bounds = this.bounds(binInstructions)

    return scaleTreshold()
      .domain(bounds)
      .range(colorScheme[bounds.length + 1])
  }
}

export default function (targetClass) {
  Object.assign(targetClass.prototype, methods)
}
