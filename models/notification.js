const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  sender: { type: String, required: true },
  title: { type: String, required: true},
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Notification', notificationSchema);