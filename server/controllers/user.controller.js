import Booking from '../models/booking.model.js';
import Movie from '../models/movie.model.js';
import User from '../models/user.model.js';

export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.sub;
    const bookings = await Booking.find({ user: userId })
      .populate({ path: 'show', populate: { path: 'movie' } })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('getUserBookings error', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getUserHistory = async (req, res) => {
  try {
    const userId = req.user.sub;
    const now = new Date().toISOString();

    const bookings = await Booking.find({ user: userId, isPaid: true })
      .populate({ path: 'show', populate: { path: 'movie' } })
      .sort({ createdAt: -1 });

    // Filter to shows whose date has already passed
    const history = bookings.filter(
      (b) => b.show?.showDateTime && b.show.showDateTime < now
    );

    res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('getUserHistory error', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateFavourite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const userId = req.user.sub;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const idx = user.favorites.indexOf(movieId);
    if (idx === -1) user.favorites.push(movieId);
    else user.favorites.splice(idx, 1);

    await user.save();
    res.status(200).json({ success: true, message: 'Favourite updated successfully' });
  } catch (error) {
    console.error('updateFavourite error', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getFavourites = async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const movies = await Movie.find({ _id: { $in: user.favorites } });
    res.status(200).json({ success: true, movies });
  } catch (error) {
    console.error('getFavourites error', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};
