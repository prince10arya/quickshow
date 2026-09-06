import { Router } from 'express';
import { confirmDummyPayment, createBooking, getOccupiedSeats } from '../controllers/booking.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validateCreateBooking, validateGetSeats } from '../validators/booking.validator.js';

const bookingRouter = Router();

bookingRouter.post('/create', protect, validateCreateBooking, createBooking);
bookingRouter.get('/confirm-dummy/:bookingId', confirmDummyPayment);
bookingRouter.get('/seats/:showId', validateGetSeats, getOccupiedSeats);

export default bookingRouter;
