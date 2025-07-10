import { clerkClient } from "@clerk/express";
import Booking from "../models/booking.model.js";
import Movie from "../models/movie.model.js";

export const getUserBookings = async (req, res) => {
  try {
    const user = req.auth().userId;
    const bookings = await Booking.find({user}).populate({
      path: 'show',
      populate: { path: 'movie'},
    }).sort({createdAt: -1});
    res.status(201).json({
      success: true,
      bookings,
    })
  } catch (error) {

    console.log("error", error.message);
    res.status(400).json({
      success: false,
      message: success.message,
    });
  }
}


export const updateFavourite = async (req, res) => {
  try {
    const { movieId } = req.body;

    const { userId } = req.auth();

    const user = await clerkClient.users.getUser(userId);

    if(!user.privateMetadata.favorites)
      user.privateMetadata.favorites = []
    if(!user.privateMetadata.favorites.includes(movieId))
      user.privateMetadata.favorites.push(movieId)
    else
     user.privateMetadata.favorites =  user.privateMetadata.favorites.filter((item) => item !== movieId);

    await clerkClient.users.updateUserMetadata(userId, {privateMetadata: user.privateMetadata})
    res.status(200).json({success: true, message: "Favourite updated successfully"})
  } catch (error) {

    console.log("error in update", error.message);
    res.status(400).json({
      success: false,
      message: success.message,
    });
  }
}
export const addFavourite = async (req, res) => {
  try {
    const { movieId } = req.body;

    const { userId } = req.auth();

    const user = await clerkClient.users.getUser(userId);

    if(!user.privateMetadata.favorites)
      user.privateMetadata.favorites = []
    if(!user.privateMetadata.favorites.includes(movieId))
      user.privateMetadata.favorites.push(movieId)
    await clerkClient.users.updateUserMetadata(userId, {privateMetadata: user.privateMetadata})
    res.json.status(201)({success: true, message: "Favourite added successfully"})
  } catch (error) {

    console.log("error in add", error.message);
    res.status(400).json({
      success: false,
      message: success.message,
    });
  }
}

export const getFavourites = async (req, res) => {
  try {
    const user = await clerkClient.users.getUser(req.auth().userId)
    const favorites = user.privateMetadata.favorites;

    //* Getting movies from database
    const movies = await Movie.find({_id: {$in: favorites}})

    res.status(200).json({ success: true, movies });

  } catch (error) {

    console.log("error in get", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}
