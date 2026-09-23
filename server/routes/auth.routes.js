import { Router } from 'express';
import { getMe, login, logout, refresh, register } from '../controllers/auth.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { validateLogin, validateRegister } from '../validators/auth.validator.js';

const authRouter = Router();

authRouter.post('/register', validateRegister, register);
authRouter.post('/login', validateLogin, login);
authRouter.post('/refresh', refresh);
authRouter.post('/logout', logout);
authRouter.get('/me', protect, getMe);

export default authRouter;
