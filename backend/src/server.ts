import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws'; // Import WebSocket type
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import inventoryRoutes from './routes/inventory';
import transactionRoutes from './routes/transactions';
import maintenanceRoutes from './routes/maintenance';
import alertRoutes from './routes/alerts';
import billRoutes from './routes/bills';
import dashboardRoutes from './routes/dashboard';

// Load environment variables
dotenv.config();

// Initialize Prisma client
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Create Express app
const app = express();
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

// Global WebSocket clients storage
// Add a 'isAlive' property to each WebSocket for heartbeat tracking
export const wsClients = new Set<WebSocket & { isAlive: boolean }>();

// --- WebSocket Heartbeat Implementation ---
const interval = setInterval(() => {
  wsClients.forEach((ws) => {
    if (ws.isAlive === false) {
      logger.warn('Terminating unresponsive WebSocket connection');
      return ws.terminate(); // Terminate if no pong received from previous ping
    }

    ws.isAlive = false; // Mark as not alive
    ws.ping(); // Send ping
  });
}, 30000); // Ping every 30 seconds (adjust as needed)

wss.on('close', () => {
  clearInterval(interval); // Clear interval when WebSocket server closes
});

wss.on('connection', (ws) => {
  logger.info('New WebSocket connection established');
  (ws as any).isAlive = true; // Initialize isAlive for new connection

  wsClients.add(ws as WebSocket & { isAlive: boolean });
  
  // Respond to pings from client (or mark as alive when pong received)
  ws.on('pong', () => {
    (ws as any).isAlive = true;
  });

  ws.on('close', (code, reason) => {
    logger.info(`WebSocket connection closed. Code: ${code}, Reason: ${reason ? reason.toString() : 'N/A'}`);
    wsClients.delete(ws as WebSocket & { isAlive: boolean });
  });
  
  ws.on('error', (error) => {
    logger.error('WebSocket error:', error);
    wsClients.delete(ws as WebSocket & { isAlive: boolean });
  });
});

// Broadcast function for real-time updates
export const broadcastUpdate = (type: string, data: any) => {
  const message = JSON.stringify({ type, data });
  wsClients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        logger.error('Error sending WebSocket message:', error);
        // Remove client if sending fails (likely disconnected)
        wsClients.delete(client); 
      }
    }
  });
};

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint - NOW INCLUDES DATABASE CONNECTION CHECK
app.get('/health', async (req, res) => { 
  let dbConnected = false;
  try {
    await prisma.$connect(); // Attempt to connect to the database
    dbConnected = true;
    await prisma.$disconnect(); // Disconnect immediately after checking
  } catch (error) {
    logger.error('Database health check failed:', error);
    dbConnected = false;
  }

  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: { // This object is crucial for the frontend debug panel
      connected: dbConnected,
      type: 'SQLite' // Or 'PostgreSQL', etc.
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/categories', authenticateToken, categoryRoutes);
app.use('/api/inventory', authenticateToken, inventoryRoutes);
app.use('/api/transactions', authenticateToken, transactionRoutes);
app.use('/api/maintenance', authenticateToken, maintenanceRoutes);
app.use('/api/alerts', authenticateToken, alertRoutes);
app.use('/api/bills', authenticateToken, billRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  // Close all WebSocket connections on shutdown
  wsClients.forEach(ws => ws.terminate());
  clearInterval(interval); // Clear the heartbeat interval
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  // Close all WebSocket connections on shutdown
  wsClients.forEach(ws => ws.terminate());
  clearInterval(interval); // Clear the heartbeat interval
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`WebSocket server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
