require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const Message = require('./models/Message');
const Announcement = require('./models/Announcement');

const app = express();

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173";

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`User ${socket.id} joined room: ${roomName}`);
  });

  socket.on('send_message', async (messageData) => {
    try {
      const newMessage = new Message({
        room: messageData.room,
        author: messageData.author,
        text: messageData.text,
        time: messageData.time
      });

      await newMessage.save();

      socket.to(messageData.room).emit(
        'receive_message',
        messageData
      );

    } catch (error) {
      console.error(error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;

  try {
    const { OAuth2Client } = require('google-auth-library');

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID
    );

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();

    const email = payload.email;
    const name = payload.name;

    if (!email.endsWith('@mnnit.ac.in')) {
      return res.status(403).json({
        success: false,
        message:
          'Access denied. You must use an official @mnnit.ac.in email address.'
      });
    }

    let role = 'student';

    if (email === 'proff@mnnit.ac.in') {
      role = 'prof';
    }

    res.status(200).json({
      success: true,
      role,
      user: { name, email }
    });

  } catch (error) {
    console.error(error);

    res.status(401).json({
      success: false,
      message: 'Invalid or expired Google token'
    });
  }
});

app.post('/api/announcements', async (req, res) => {
  try {
    const { title, content, author, targetGroup } = req.body;

    const announcement = new Announcement({
      title,
      content,
      author,
      targetGroup
    });

    await announcement.save();

    res.status(201).json({
      success: true,
      announcement
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false
    });
  }
});

app.get('/api/messages/:roomName', async (req, res) => {
  try {
    const messages = await Message
      .find({ room: req.params.roomName })
      .sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      data: messages
    });

  } catch (err) {
    res.status(500).json({
      success: false
    });
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});