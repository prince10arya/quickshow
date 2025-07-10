import express from 'express'
import { clerkMiddleware } from "@clerk/express";
import cors from 'cors';
import 'dotenv/config';
import {serve} from 'inngest/express'


import connectDb from './config/db.js';
import { functions, inngest } from './inngest/index.js';
import showRouter from './routes/show.routes.js';
import bookingRouter from './routes/booking.routes.js';
import adminRouter from './routes/admin.routes.js';
import userRouter from './routes/user.routes.js';
import { stripeWebHooks } from './controllers/stripewebhooks.controllers.js';


const app = express()
const port = 3000

//* Middleware
app.use(express.json())
app.use(cors())
app.use(clerkMiddleware())

app.use('api/stripe', express.raw({type: 'application/json'}), stripeWebHooks)

app.use('/api/inngest', serve({client: inngest, functions}))
app.use('/api/shows',showRouter)
app.use('/api/bookings',bookingRouter)
app.use('/api/admin',adminRouter)
app.use('/api/user', userRouter)

app.get('/', (req, res)=>{
    res.send("<h1> Hello, World </h1>")
})

await connectDb();
app.listen(port, () => console.log(`Example app listening on http://localhost:${port}`))
