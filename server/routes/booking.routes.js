import { Router } from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { createBooking, getOccupiedSeats } from '../controllers/booking.controller.js';

const bookingRouter = Router();

bookingRouter.post('/create', protect, createBooking);
bookingRouter.get('/seats/:showId', getOccupiedSeats); // public — no auth needed to view seats

export default bookingRouter;
