import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { initSocket } from './config/socket.js';
import { sequelize } from './models/index.js';
import authRoutes from './routes/authRoutes.js';
import urlRoutes from './routes/urlRoutes.js';
import { handleRedirect } from './controllers/RedirectController.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const server = http.createServer(app);
initSocket(server, FRONTEND_URL);

// Middleware
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/urls', urlRoutes);

// Server-side Redirection Route (Handles Short URLs & Custom Aliases)
app.get('/:shortCode', handleRedirect);

// Base route
app.get('/', (req, res) => {
  res.send('URL Shortener API is running.');
});

// Database Sync and Server Startup
async function startServer() {
  try {
    console.log('Connecting to PostgreSQL database...');
    // Sync database models (alter tables to match changes in model definitions)
    await sequelize.sync({ alter: true });
    console.log('PostgreSQL database synced successfully.');

    server.listen(PORT, () => {
      console.log(`========================================`);
      console.log(`Server is running on port ${PORT}`);
      console.log(`API URL: http://localhost:${PORT}/api`);
      console.log(`Redirect base: http://localhost:${PORT}`);
      console.log(`========================================`);
    });
  } catch (error) {
    console.error('Database connection failed:');
    console.error(error.message);
    console.log('\n======================================================');
    console.log('PLEASE CHECK YOUR DATABASE CONFIGURATION IN /backend/.env');
    console.log('Ensure the database server is running and the credentials');
    console.log('in DATABASE_URL are correct.');
    console.log('======================================================\n');
    process.exit(1);
  }
}

startServer();
