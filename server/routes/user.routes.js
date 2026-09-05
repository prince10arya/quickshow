import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { getFavourites, getUserBookings, updateFavourite } from '../controllers/user.controller.js';

const userRouter = Router();

userRouter.get('/bookings', protect, getUserBookings);
userRouter.post('/update-favourite', protect, updateFavourite);
userRouter.get('/favourites', protect, getFavourites);

export default userRouter;
