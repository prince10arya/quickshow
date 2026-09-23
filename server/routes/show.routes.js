import { Router } from 'express';
import { addShow, getNowPlayingMovies, getShow, getShows } from '../controllers/show.controller.js';
import { protectAdmin } from '../middlewares/auth.middleware.js';
import { validateAddShow, validateGetShow } from '../validators/show.validator.js';

const showRouter = Router();

showRouter.get('/nowshowing', protectAdmin, getNowPlayingMovies);
showRouter.post('/addshow', protectAdmin, validateAddShow, addShow);
showRouter.get('/all', getShows);
showRouter.get('/:movieId', validateGetShow, getShow);

export default showRouter;
