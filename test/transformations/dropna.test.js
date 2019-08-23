import DataContainer from '../../src/index.js'
import movies from '../__data__/movies.json'

describe('dropNA transformation', () => {
  test('dropNA works as expected', () => {
    const reformattedData = movies.map(d => {
      return {
        Title: String(d.Title),
        Rotten_Tomatoes_Rating: d.Rotten_Tomatoes_Rating,
        IMDB_Rating: d.IMDB_Rating
      }
    })

    const dataContainer = new DataContainer(reformattedData)
    const withoutNA = dataContainer.dropNA()

    expect(dataContainer.column('Rotten_Tomatoes_Rating').some(v => v === null)).toBe(true)
    expect(withoutNA.column('Rotten_Tomatoes_Rating').some(v => v === null)).toBe(false)
  })
})
