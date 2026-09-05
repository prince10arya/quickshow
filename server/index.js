import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import 'dotenv/config';
import { serve } from 'inngest/express';

import connectDb from './config/db.js';
import { functions, inngest } from './inngest/index.js';
import authRouter from './routes/auth.routes.js';
import showRouter from './routes/show.routes.js';
import bookingRouter from './routes/booking.routes.js';
import adminRouter from './routes/admin.routes.js';
import userRouter from './routes/user.routes.js';
import { stripeWebHooks } from './controllers/stripewebhooks.controllers.js';
import { setServers } from "node:dns/promises";
setServers(["1.1.1.1"]);
const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(cookieParser());

app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebHooks);
app.use('/api/inngest', serve({ client: inngest, functions }));
app.use('/api/auth', authRouter);
app.use('/api/shows', showRouter);
app.use('/api/bookings', bookingRouter);
app.use('/api/admin', adminRouter);
app.use('/api/user', userRouter);

app.get('/', (_req, res) => res.send('<h1>QuickShow API</h1>'));

await connectDb();
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
