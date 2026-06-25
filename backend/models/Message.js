const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room: { type: String, required: true }, // e.g., 'Group A'
  author: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: String, required: true },
  timestamp: { type: Date, default: Date.now } // Hidden exact time for sorting
});

module.exports = mongoose.model('Message', messageSchema);