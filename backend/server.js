require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const { OAuth2Client } = require('google-auth-library');

const Message = require('./models/Message');
const Announcement = require('./models/Announcement');

const app = express();

// ==========================================
// 1. DYNAMIC CORS CONFIGURATION
// ==========================================
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:5173',
  'https://collegeconnect-pi.vercel.app',
  'https://chat-sys-xi.vercel.app',
];

const envFrontendUrls = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((url) => url.trim().replace(/\/$/, ''))
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envFrontendUrls].filter(Boolean)));

const isOriginAllowed = (origin) => {
  if (!origin) return true; // Server-to-server or tools without origin header
  const normalized = origin.trim().replace(/\/$/, '');
  if (allowedOrigins.includes(normalized)) return true;
  // Allow all Vercel deployment preview and production URLs
  if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(normalized)) return true;
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS Blocked] Origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// ==========================================
// 2. SOCKET.IO SETUP
// ==========================================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Socket origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  socket.on('join_room', (roomName) => {
    if (!roomName) return;
    socket.join(roomName);
    console.log(`[Socket] ${socket.id} joined room: "${roomName}"`);
  });

  socket.on('leave_room', (roomName) => {
    if (!roomName) return;
    socket.leave(roomName);
    console.log(`[Socket] ${socket.id} left room: "${roomName}"`);
  });

  socket.on('send_message', async (messageData) => {
    try {
      if (!messageData || !messageData.room || !messageData.text) {
        return;
      }

      const text = String(messageData.text).trim();
      if (!text) return;

      const payload = {
        room: messageData.room,
        author: messageData.author || 'Anonymous',
        text: text,
        time:
          messageData.time ||
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(),
      };

      // 1. Immediately push real-time broadcast to all peers in the room
      socket.to(messageData.room).emit('receive_message', payload);

      // 2. Persist to MongoDB if connected
      if (mongoose.connection.readyState === 1) {
        const newMessage = new Message(payload);
        await newMessage.save();
      } else {
        console.warn('[DB Warning] MongoDB not connected; message broadcasted but not persisted.');
      }
    } catch (error) {
      console.error('[Socket Message Error]', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
  });
});

// ==========================================
// 3. DATABASE CONNECTION & AUTO-RETRY
// ==========================================
const connectMongoDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('WARNING: MONGO_URI is not defined in environment variables.');
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB Connected successfully.');
  } catch (err) {
    console.error('MongoDB Connection Error:', err.message);
    console.log('Retrying MongoDB connection in 15 seconds...');
    setTimeout(connectMongoDB, 15000);
  }
};

connectMongoDB();

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected. Attempting reconnection...');
  setTimeout(connectMongoDB, 10000);
});

// ==========================================
// 4. REST API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    dbState: mongoose.connection.readyState,
    dbStatus:
      mongoose.connection.readyState === 1
        ? 'connected'
        : mongoose.connection.readyState === 2
        ? 'connecting'
        : 'disconnected',
  });
});

app.get('/', (req, res) => {
  res.send('CSE Connect Backend API is running.');
});

// Google OAuth Authentication
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Google ID token is required.',
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({
      success: false,
      message: 'GOOGLE_CLIENT_ID is not configured on the server.',
    });
  }

  try {
    const client = new OAuth2Client(clientId);

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(401).json({
        success: false,
        message: 'Unable to extract email from Google token.',
      });
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || email.split('@')[0];

    // Restrict strictly to official MNNIT domain
    if (!email.endsWith('@mnnit.ac.in')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You must use an official @mnnit.ac.in email address.',
      });
    }

    // Role identification
    const defaultProfEmails = ['proff@mnnit.ac.in', 'prof@mnnit.ac.in'];
    const envProfEmails = process.env.PROF_EMAILS
      ? process.env.PROF_EMAILS.split(',').map((e) => e.trim().toLowerCase())
      : [];
    const profEmails = new Set([...defaultProfEmails, ...envProfEmails]);

    let role = 'student';
    if (
      profEmails.has(email) ||
      email.startsWith('prof.') ||
      email.startsWith('faculty.')
    ) {
      role = 'prof';
    }

    return res.status(200).json({
      success: true,
      role,
      user: { name, email },
    });
  } catch (error) {
    console.error('[Auth Error]', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired Google token: ' + error.message,
    });
  }
});

// Announcements Endpoints
app.post('/api/announcements', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database is disconnected. Please resume MongoDB Atlas cluster.',
      });
    }

    const { title, content, author, targetGroup } = req.body;

    if (!title || !content || !author || !targetGroup) {
      return res.status(400).json({
        success: false,
        message: 'title, content, author, and targetGroup are required.',
      });
    }

    const announcement = new Announcement({
      title,
      content,
      author,
      targetGroup,
    });

    await announcement.save();

    return res.status(201).json({
      success: true,
      announcement,
    });
  } catch (err) {
    console.error('[Announcement Error]', err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

app.get('/api/announcements', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, data: [] });
    }
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

app.get('/api/announcements/:group', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({ success: true, data: [] });
    }
    const { group } = req.params;
    const announcements = await Announcement.find({
      $or: [{ targetGroup: group }, { targetGroup: 'All' }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: announcements,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// Messages History Endpoint
app.get('/api/messages/:roomName', async (req, res) => {
  try {
    // If database is disconnected or paused, return empty list with clear notice instead of hanging for 10s
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: true,
        data: [],
        dbWarning: 'Database cluster is paused or reconnecting. Real-time messages are active.',
      });
    }

    const messages = await Message.find({ room: req.params.roomName }).sort({ timestamp: 1 });

    return res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (err) {
    console.error('[Messages History Error]', err.message);
    return res.status(500).json({
      success: false,
      message: err.message,
      data: [],
    });
  }
});

// ==========================================
// 5. SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Configured allowed origins:`, allowedOrigins);
});
