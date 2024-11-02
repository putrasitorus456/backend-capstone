const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  anchor_code: { type: String, required: true },
  streetlight_code: { type: String},
  location: { type: [Number], required: true },
  problem: { type: String, default: "" },
  last_status: { type: Number, required: true},
  repaired_yet: { type: Number, required: true, default: 0 },
  reported_by: { type: String, required: true, default: "Sistem" },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Event || mongoose.model('Event', eventSchema);