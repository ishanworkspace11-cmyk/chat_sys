require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const Message = require('./models/Message');
const mongoose = require('mongoose');
const Announcement = require('./models/Announcement');

const app = express();

// 1. MIDDLEWARE
app.use(cors());
app.use(express.json()); 

// 2. SERVER & SOCKET SETUP
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  socket.on('join_room', (roomName) => {
    socket.join(roomName);
    console.log(`User ${socket.id} joined room: ${roomName}`);
  });

  socket.on('send_message', async (messageData) => {
    console.log("RECEIVED FROM FRONTEND:", messageData);

    try {
      const newMessage = new Message({
        room: messageData.room,
        author: messageData.author,
        text: messageData.text,
        time: messageData.time
      });

      await newMessage.save();
      console.log("SAVED TO MONGODB SUCCESSFULLY!");

      socket.to(messageData.room).emit('receive_message', messageData);
      
    } catch (error) {
      console.error("MONGODB SAVE ERROR:", error.message);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// 3. DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Successfully connected to MongoDB!"))
  .catch((err) => console.error("MongoDB connection error:", err));

// 4. API ROUTES
app.post('/api/auth/google', async (req, res) => {
  const { token } = req.body;
  
  try {
    const { OAuth2Client } = require('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const email = payload['email'];
    const name = payload['name'];
    
    if (!email.endsWith('@mnnit.ac.in')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. You must use an official @mnnit.ac.in email address.' 
      });
    }
    
    let role = 'student';
    if (email === 'proff@mnnit.ac.in') {
        role = 'prof';
    }

    res.status(200).json({ 
      success: true, 
      role: role,
      user: { name, email }
    });
    
  } catch (error) {
    console.error("Token verification failed:", error);
    res.status(401).json({ success: false, message: 'Invalid or expired Google token' });
  }
});

app.post('/api/announcements', async (req, res) => {
    try {
      const { title, content, author, targetGroup } = req.body;
      
      const newAnnouncement = new Announcement({
        title: title,
        content: content,
        author: author,
        targetGroup: targetGroup
      });
      
      await newAnnouncement.save();
      
      res.status(201).json({
        success: true,
        message: 'Announcement posted successfully',
        announcement: newAnnouncement
      });
    } catch(err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Failed to post announcement' });
    }
});

app.get('/api/messages/:roomName', async (req, res) => {
  try {
    const room = req.params.roomName;
    const messages = await Message.find({ room: room }).sort({ timestamp: 1 });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    res.status(500).json({ success: false, message: 'Server error fetching messages' });
  }
});

// 5. START SERVER
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});