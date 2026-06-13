import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurations & Database
import connectDB from './config/db.js';
import { socketHandler } from './sockets/socketHandler.js';

// Middlewares
import { errorHandler, notFound } from './middlewares/errorMiddleware.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import channelRoutes from './routes/channelRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import gitRoutes from './routes/gitRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import sprintRoutes from './routes/sprintRoutes.js';

dotenv.config();

// Connect to MongoDB Database
connectDB();

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  process.env.CLIENT_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// Initialize Socket.io with CORS
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: corsOptions.origin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Setup Socket events
socketHandler(io);

// Expose io on app object to access in route controllers if needed
app.set('socketio', io);

// Logger for development
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// Serve uploaded files statically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/workspace', workspaceRoutes);
app.use('/api/channel', channelRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/git', gitRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/sprints', sprintRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.send('API is running successfully...');
});

// Centralized error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
// Nodemon trigger comment
