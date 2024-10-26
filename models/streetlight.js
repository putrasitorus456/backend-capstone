const mongoose = require('mongoose');

const streetlightSchema = new mongoose.Schema({
  anchor_code: { type: String, required: true },
  streetlight_code: { type: String},
  nodes: { type: Number},
  location: { type: [Number], required: true },
  installed_yet: { type: Number, required: true, default: 1 },
  condition: { type: Number, required: true, default: 1 },
  status: { type: Number, required: true, default: 1 },
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Streetlight', streetlightSchema);