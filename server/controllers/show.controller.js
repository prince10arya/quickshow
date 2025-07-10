import axios from "axios";
import Movie from "../models/movie.model.js";
import { options } from "../config/axios.js";
import Show from "../models/show.model.js";

const { url, headers } = options;
export const getNowPlayingMovies = async (req, res) => {
  try {
    const { data } = await axios.get(`${url}/most-popular-movies`, {
      headers: headers,
    });
    const selectedMoviesData = data.slice(0,30).filter(movie => movie.primaryImage != null && movie.primaryImage !== undefined).map((movie) => ({
      id: movie.id, // Or movie._id if your backend uses _id
      originalTitle: movie.originalTitle,
      primaryImage: movie.primaryImage,
      averageRating: movie.averageRating,
      numVotes: movie.numVotes,
      releaseDate: movie.releaseDate,
      // Add any other specific values you need here
      // For example, if you need release_date:
      // release_date: movie.release_date
    }));
    const movies = selectedMoviesData;
    res.json({ success: true, movies: movies});
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: error.message });
  }
};

//* API to add a new show to the database
export const addShow = async (req, res) => {
  try {
    //const { movieId, showsInput, showPrice } = req.body;
    const { movieId, showPrice, showsInput } = req.body;
    let movie = await Movie.findById(movieId);
    if (!movie) {
      const { data } = await axios.get(`${url}/${movieId}`, {
        headers: headers,
      });
      const {
        id,
        originalTitle,
        description,
        primaryImage,
        thumbnails,
        genres,
        cast,
        runtimeMinutes,
        averageRating,
        releaseDate,
        spokenLanguages,
      } = data;
      const movieDetails = {
        _id: id,
        title: originalTitle,
        overview: description,
        poster_path: primaryImage,
        backdrop_path: thumbnails,
        release_date: releaseDate,
        original_laguage: spokenLanguages[0],
        genres: genres,
        casts: cast.slice(0, 11),
        vote_average: averageRating,
        runtime: runtimeMinutes,
      };

      movie = await Movie.create(movieDetails);
    }
    const showsToCreate = [];
    showsInput.forEach((show) => {
      const showDate = show.date;
      show.time.forEach((time) => {
        const dateTimeString = `${showDate}T${time}`;
        showsToCreate.push({
          movie: movieId,
          showDateTime: new Date(dateTimeString).toISOString(),
          showPrice,
          occupiedSeats: {},
        });
      });
    });
    if (showsToCreate.length > 0) {
      await Show.insertMany(showsToCreate);
    }
    res.json({ success: true, message: "show Added successfully" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, error: error.message });
  }
};

//* API to gat all shows from the database
export const getShows = async (req, res) => {
  try {
    const shows = await Show.find({showDateTime: {$gte: new Date().toISOString()}}).populate('movie').sort({ showDateTime: 1});
    //* filter unique shows
    const uniqueShows = new Set(shows.map(show => show.movie))
    res.status(200).json({
      success: true,
      show: Array.from(uniqueShows),
    })
  } catch (error) {
    console.error(error)
    res.status(400).json({
      success: false,
      message: error.message,
    })
  }
}

//* Api to get a single show from the database
export const getShow = async (req, res) => {
  try {
    const { movieId } = req.params;
    //* get all upcoming show for the movie
    const shows = await Show.find({movie: movieId, showDateTime:{ $gte: new Date().toISOString()}})
    const movie = await Movie.findById(movieId);
    const dateTime = {};
    shows.forEach(show => {
      const date = show.showDateTime.split("T")[0];
      if(!dateTime[date])
        dateTime[date] = [];
      dateTime[date].push({ time: show.showDateTime, showId: show._id })
    });
    res.status(200).json({
      success: true,
      movie: movie,
      dateTime: dateTime,
    });

  } catch (error) {
    console.error(error)
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}
