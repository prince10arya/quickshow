import { Router } from 'express';
import {
  getFavourites,
  getUserBookings,
  getUserHistory,
  updateFavourite,
} from '../controllers/user.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validateUpdateFavourite } from '../validators/user.validator.js';

const userRouter = Router();

userRouter.get('/bookings', protect, getUserBookings);
userRouter.get('/history', protect, getUserHistory);
userRouter.post('/update-favourite', protect, validateUpdateFavourite, updateFavourite);
userRouter.get('/favourites', protect, getFavourites);

export default userRouter;
