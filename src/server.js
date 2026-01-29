import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import routeRoutes from './routes/routeRoutes.js';



const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', // Vite default
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/route', routeRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'GTFS Backend API is running' });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
