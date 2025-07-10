export const options = {
  url: "https://imdb236.p.rapidapi.com/api/imdb",
  params: {
    page: "1",
    pageSize: "10",
  },
  headers: {
    "x-rapidapi-key": `${process.env.IMDB_API_KEY}`,
    "x-rapidapi-host": process.env.HOST,
  },
};
