const axios = require('axios');
const Streetlight = require('../models/streetlight');
const Event = require('../models/event');

const createStreetlight = async (req, res) => {
  try {
    const { anchor_code, streetlight_code, nodes, location, installed_yet, condition, status } = req.body;

    if (!anchor_code || !location) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!Array.isArray(location) || location.length !== 2) {
      return res.status(400).json({ message: 'Location must be an array of [latitude, longitude]' });
    }

    const [lat, lon] = location;
    if (typeof lat !== 'number' || typeof lon !== 'number' || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ message: 'Not valid value for lat and lon' });
    }

    const existingStreetlight = await Streetlight.findOne({ anchor_code, streetlight_code });
    if (existingStreetlight) {
      return res.status(400).json({ message: 'Streetlight already exists' });
    }

    const newStreetlight = new Streetlight({
      anchor_code,
      streetlight_code,
      nodes,
      location,
      installed_yet,
      condition,
      status
    });

    const savedStreetlight = await newStreetlight.save();

    try { // kalo jalanin di local, tinggal ganti URL_PROD jadi URL_LOCAL
      const eventResponse = await axios.post(`${process.env.URL_PROD}/api/events`, {
        anchor_code,
        streetlight_code,
        location,
        last_status: 0
      });
    } catch (apiError) {
      console.error('Error calling event API:', apiError.message);
    }

    res.status(201).json(savedStreetlight);
  } catch (error) {
    res.status(500).json({ message: 'Error creating streetlight', error: error.message });
  }
};

const getStreetlights = async (req, res) => {
  try {
    const streetlights = await Streetlight.find();
    res.status(200).json(streetlights);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching streetlights', error: error.message });
  }
};

const getStreetlightById = async (req, res) => {
  try {
    const streetlight = await Streetlight.findById(req.params.id);
    if (!streetlight) {
      return res.status(404).json({ message: 'Streetlight not found' });
    }
    res.status(200).json(streetlight);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching streetlight', error: error.message });
  }
};

const updateStreetlight = async (req, res) => {
  try {
    const { anchor_code, streetlight_code, nodes, location, installed_yet, condition, status } = req.body;

    if (!anchor_code) {
      return res.status(400).json({ message: 'Anchor code required' });
    }

    // Cek apakah sudah ada streetlight lain dengan anchor_code dan streetlight_code yang sama, kecuali yang sedang diupdate
    const existingStreetlight = await Streetlight.findOne({
      anchor_code,
      streetlight_code,
      _id: { $ne: req.params.id }
    });

    if (existingStreetlight) {
      return res.status(400).json({ message: 'Streetlight already exists' });
    }

    // Ambil streetlight yang akan diperbarui
    const streetlightToUpdate = await Streetlight.findById(req.params.id);
    
    if (!streetlightToUpdate) {
      return res.status(404).json({ message: 'Streetlight not found' });
    }

    // Simpan streetlight_code yang lama untuk digunakan dalam pembaruan event
    const oldAnchorCode = streetlightToUpdate.anchor_code;
    const oldStreetlightCode = streetlightToUpdate.streetlight_code;

    // Update streetlight
    const updatedStreetlight = await Streetlight.findByIdAndUpdate(
      req.params.id,
      { anchor_code, streetlight_code, nodes, location, installed_yet, condition, status },
      { new: true }
    );

    // Update event yang memiliki anchor_code dan streetlight_code yang sama dengan yang lama
    await Event.updateMany(
      { anchor_code: oldAnchorCode, streetlight_code: oldStreetlightCode },
      { anchor_code: updatedStreetlight.anchor_code, streetlight_code: updatedStreetlight.streetlight_code }
    );

    res.status(200).json(updatedStreetlight);
  } catch (error) {
    res.status(500).json({ message: 'Error updating streetlight and related events', error: error.message });
  }
};

const deleteStreetlight = async (req, res) => {
  try {
    // Menghapus streetlight berdasarkan id
    const deletedStreetlight = await Streetlight.findByIdAndDelete(req.params.id);

    if (!deletedStreetlight) {
      return res.status(404).json({ message: 'Streetlight not found' });
    }

    // Menghapus event yang memiliki anchor_code dan streetlight_code yang sama
    await Event.deleteOne({
      anchor_code: deletedStreetlight.anchor_code,
      streetlight_code: deletedStreetlight.streetlight_code
    });

    res.status(200).json({ message: 'Streetlight and related events deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting streetlight and events', error: error.message });
  }
};

const getStreetlightStats = async (req, res) => {
  try {
    const totalStreetlights = await Streetlight.countDocuments();

    const installedYet1 = await Streetlight.countDocuments({ installed_yet: 1 });
    const installedYet0 = await Streetlight.countDocuments({ installed_yet: 0 });

    const condition1 = await Streetlight.countDocuments({ condition: 1 });
    const condition0 = await Streetlight.countDocuments({ condition: 0 });

    res.status(200).json({
      totalStreetlights,
      installed_yet_1: installedYet1,
      installed_yet_0: installedYet0,
      condition_1: condition1,
      condition_0: condition0
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching streetlight stats', error: error.message });
  }
};

module.exports = {
  createStreetlight,
  getStreetlights,
  getStreetlightById,
  updateStreetlight,
  deleteStreetlight,
  getStreetlightStats
};