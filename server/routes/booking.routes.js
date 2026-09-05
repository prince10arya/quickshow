import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { createBooking, confirmDummyPayment, getOccupiedSeats } from '../controllers/booking.controller.js';

const bookingRouter = Router();

bookingRouter.post('/create', protect, createBooking);
bookingRouter.get('/confirm-dummy/:bookingId', confirmDummyPayment); // dummy payment confirm → redirect
bookingRouter.get('/seats/:showId', getOccupiedSeats);

export default bookingRouter;
