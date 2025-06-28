import express from 'express'
import { clerkMiddleware } from "@clerk/express";
import cors from 'cors';
import 'dotenv/config';
import {serve} from 'inngest/express'


import connectDb from './config/db.js';
import { functions, inngest } from './inngest/index.js';


const app = express()
const port = 3000

//* Middleware
app.use(express.json())
app.use(cors())
app.use(clerkMiddleware())
 
app.get('/', (req, res) => res.send('Hello World!'))
app.use('/api/inngest', serve({client: inngest, functions}))


await connectDb();
app.listen(port, () => console.log(`Example app listening on http://localhost:${port}`))
