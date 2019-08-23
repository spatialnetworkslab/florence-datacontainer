export default {
  count,
  sum,
  mean,
  median,
  mode,
  min,
  max
}

function count (column) {
  return column.length
}

function sum (column) {
  let total = 0
  for (const value of column) {
    total += value
  }

  return total
}

function mean (column) {
  return sum(column) / count(column)
}

function median (column) {
  const asc = column.sort((a, b) => a > b)
  const len = count(column)

  if (len % 2 === 1) {
    // Odd
    return asc[Math.floor(len / 2)]
  } else {
    // Even
    const lower = asc[(len / 2) - 1]
    const upper = asc[(len / 2)]
    return (lower + upper) / 2
  }
}

function mode (column) {
  const counts = {}

  for (const value of column) {
    if (value in counts) {
      counts[value]++
    } else {
      counts[value] = 1
    }
  }

  let winner
  let winningVal = 0

  for (const value in counts) {
    if (counts[value] > winningVal) {
      winningVal = counts[value]
      winner = value
    }
  }

  return winner
}

function min (column) {
  let winner = Infinity
  for (const value of column) {
    if (value < winner) { winner = value }
  }
  return winner
}

function max (column) {
  let winner = -Infinity
  for (const value of column) {
    if (value > winner) { winner = value }
  }
  return winner
}
