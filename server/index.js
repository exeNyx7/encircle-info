require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const messageRoutes = require('./routes/messages');
const securityRoutes = require('./routes/security');
const { apiLimiter, authLimiter, messageLimiter, uploadLimiter } = require('./middleware/rateLimiter');

const app = express();
const server = http.createServer(app);

// Configure CORS for production
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://your-frontend.vercel.app'] // Replace with your Vercel domain
  : ['http://localhost:3000'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/encircle', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Initialize file routes with Socket.io after io is created
const fileRoutes = require('./routes/files');

// Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageLimiter, messageRoutes);
app.use('/api/security', securityRoutes);

// Socket.io for real-time messaging
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('message', (data) => {
    // Relay encrypted message to recipient
    io.to(data.recipientId).emit('message', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Initialize file routes with Socket.io
app.use('/api/files', uploadLimiter, fileRoutes(io));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
