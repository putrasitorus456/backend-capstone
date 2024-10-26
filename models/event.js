const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  anchor_code: { type: String, required: true },
  streetlight_code: { type: String},
  problem: { type: String, default: "" },
  last_status: { type: Number, required: true},
  reported_by: { type: String, required: true, default: "Sistem" },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Event', eventSchema);