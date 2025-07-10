import {Router} from 'express'
import { protectAdmin } from '../middlewares/auth.middleware.js';
import { getAllBookings, getAllShows, getDashboardData, isAdmin } from '../controllers/admin.controller.js';


 const adminRouter = Router();

 adminRouter.get('/is-admin', protectAdmin, isAdmin)
 adminRouter.get('/dashboard', protectAdmin, getDashboardData)
 adminRouter.get('/all-shows', protectAdmin, getAllShows)
 adminRouter.get('/all-bookings', protectAdmin, getAllBookings)


 export default adminRouter
