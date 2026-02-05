import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes.js';
import routeRoutes from './routes/routeRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import gtfsRoutes from './routes/gtfsRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL, // Vite default
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/route', routeRoutes);
app.use('/api/gtfs', gtfsRoutes);
app.use('/api/public', publicRoutes);

// Global Error Handler
app.use(errorHandler);

app.get('/', (req, res) => {
    res.json({ message: 'GTFS Backend API is running' });
});

// Start Server
async function startServer() {
    try {
        // validate env vars
        const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
        const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

        if (missingEnvVars.length > 0) {
            console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
            process.exit(1);
        }

        // Test DB connection
        const { prisma } = await import('./utils/prisma.js');
        await prisma.$connect();
        console.log('Database connection established successfully');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
