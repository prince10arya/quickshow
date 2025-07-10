import { Router } from 'express'
import { createBooking, getOccupiedSeats } from '../controllers/booking.controller.js';

const bookingRouter = Router();

bookingRouter.post('/create', createBooking);
bookingRouter.get('/seats/:showId', getOccupiedSeats);

export default bookingRouter;
