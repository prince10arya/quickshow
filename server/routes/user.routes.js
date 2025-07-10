import { Router } from 'express'
import { getFavourites, getUserBookings, updateFavourite } from '../controllers/user.controller.js';

const userRouter = Router();

userRouter.get('/bookings', getUserBookings);
userRouter.post('/update-favourite', updateFavourite);
userRouter.get('/favourites', getFavourites);

export default userRouter
