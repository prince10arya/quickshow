//* check if user is admin

import Booking from "../models/booking.model.js"
import Show from '../models/show.model.js';
import User from "../models/user.model.js";

export const isAdmin = async (req, res) => {
  res.json({
    success: true, isAdmin: true,
  })
}

//* API to get dashboard data

export const getDashboardData = async (req, res) => {
  try {
    const bookings = await Booking.find({isPaid: true});
    const activeShows = await Show.find({showDateTime: {$gte: new Date().toISOString()}}).populate('movie');

    const totalUser = await User.countDocuments();

    const dashboardData = {
      totalBooking: bookings.length,
      totalRevenue: bookings.reduce((acc, booking) => acc + booking.amount, 0 ),
      activeShows,
      totalUser,
    }

    res.status(200).json({
      success:true, dashboardData
    })
  } catch (error) {
    console.log("error", error.message);
    res.status(400).json({
      success: false,
      message: success.message,
    });
  }
}

export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({showDateTime: {$gte: new Date().toISOString()}}).populate('movie').sort({ showDateTime: 1});
    
    res.status(200).json({ succes: true, shows})
  } catch (error) {
    console.log("error", error.message);
    res.status(400).json({
      success: false,
      message: success.message,
    });
  }
}

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({}).populate('user').populate({
      path: "show",
      populate: { path: "movie"},
    }).sort({ createdAt: -1})
    res.status(200).json({succes: true, bookings} )
  } catch (error) {
    console.log("error", error.message);
    res.status(400).json({
      success: false,
      message: success.message,
    });
  }
}
