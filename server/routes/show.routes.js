import { Router } from 'express'
import { addShow, getNowPlayingMovies, getShow, getShows } from '../controllers/show.controller.js';
import { protectAdmin } from '../middlewares/auth.middleware.js';

const showRouter = Router();

showRouter.get('/nowshowing',protectAdmin, getNowPlayingMovies);
showRouter.post('/addshow',protectAdmin, addShow);
showRouter.get('/all', getShows);
showRouter.get('/:movieId', getShow);
export default showRouter;
