const axios = require('axios');
const Streetlight = require('../models/streetlight');
const Event = require('../models/event');

const createStreetlight = async (req, res) => {
  try {
    const { anchor_code, streetlight_code, nodes, location, installed_yet, condition, status } = req.body;

    // Validasi input
    if (!anchor_code || !location) {
      return res.status(400).json({ message: 'Anchor code and location are required' });
    }

    if (!Array.isArray(location) || location.length !== 2) {
      return res.status(400).json({ message: 'Location must be an array of [latitude, longitude]' });
    }

    const [lat, lon] = location;
    if (typeof lat !== 'number' || typeof lon !== 'number' || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ message: 'Invalid values for latitude and longitude' });
    }

    // Cek apakah streetlight sudah ada
    const existingStreetlight = await Streetlight.findOne({ anchor_code, streetlight_code });
    if (existingStreetlight) {
      return res.status(400).json({ message: 'Streetlight already exists' });
    }

    // Buat objek streetlight baru
    const newStreetlightData = {
      anchor_code,
      nodes,
      location,
      installed_yet,
      condition,
      status,
      ...(streetlight_code && { streetlight_code }) // Tambahkan streetlight_code jika ada
    };

    const newStreetlight = new Streetlight(newStreetlightData);

    // Simpan streetlight ke database
    const savedStreetlight = await newStreetlight.save();

    try {
      // Kirim event ke API eksternal
      const eventResponse = await axios.post(`${process.env.URL_PROD}/api/events`, {
        anchor_code,
        ...(streetlight_code && { streetlight_code }), // Hanya tambahkan streetlight_code jika ada
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

    // Cek apakah streetlight dengan anchor_code dan streetlight_code sudah ada (kecuali untuk ID yang diperbarui)
    let existingStreetlight;
    if (!streetlight_code) {
      existingStreetlight = await Streetlight.findOne({
        anchor_code,
        _id: { $ne: req.params.id }
      });
    } else {
      existingStreetlight = await Streetlight.findOne({
        anchor_code,
        streetlight_code,
        _id: { $ne: req.params.id }
      });
    }

    if (existingStreetlight) {
      return res.status(400).json({ message: 'Streetlight with this anchor and streetlight code already exists' });
    }

    // Ambil streetlight yang akan diperbarui
    const streetlightToUpdate = await Streetlight.findById(req.params.id);
    if (!streetlightToUpdate) {
      return res.status(404).json({ message: 'Streetlight not found' });
    }

    // Simpan anchor_code dan streetlight_code lama
    const oldAnchorCode = streetlightToUpdate.anchor_code;
    const oldStreetlightCode = streetlightToUpdate.streetlight_code;

    // Update streetlight berdasarkan apakah streetlight_code ada atau tidak
    const updatedData = {
      anchor_code,
      nodes,
      location,
      installed_yet,
      condition,
      status,
      ...(streetlight_code ? { streetlight_code } : {}) // Tambahkan streetlight_code hanya jika ada
    };

    const updatedStreetlight = await Streetlight.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true }
    );

    // Update event berdasarkan apakah streetlight_code ada atau tidak
    const eventFilter = {
      anchor_code: oldAnchorCode,
      ...(oldStreetlightCode ? { streetlight_code: oldStreetlightCode } : {})
    };

    const eventUpdate = {
      anchor_code: updatedStreetlight.anchor_code,
      ...(updatedStreetlight.streetlight_code ? { streetlight_code: updatedStreetlight.streetlight_code } : {})
    };

    await Event.updateMany(eventFilter, eventUpdate);

    res.status(200).json(updatedStreetlight);
  } catch (error) {
    res.status(500).json({ message: 'Error updating streetlight and related events', error: error.message });
  }
};

const deleteStreetlight = async (req, res) => {
  try {
    const deletedStreetlight = await Streetlight.findByIdAndDelete(req.params.id);

    if (!deletedStreetlight) {
      return res.status(404).json({ message: 'Streetlight not found' });
    }

    if (!deletedStreetlight.streetlight_code) {
      await Event.deleteOne({
        anchor_code: deletedStreetlight.anchor_code,
      });
    } else {
      await Event.deleteOne({
        anchor_code: deletedStreetlight.anchor_code,
        streetlight_code: deletedStreetlight.streetlight_code,
      });
    }

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