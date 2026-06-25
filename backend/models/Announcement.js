const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  author: { 
    type: String, 
    required: true
  },
  targetGroup: {
    type: String,
    enum: ['Group A', 'Group B', 'Group C', 'Group D', 'All'],
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', announcementSchema);