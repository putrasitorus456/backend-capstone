const axios = require('axios');
const Notification = require('../models/notification');
const Streetlight = require('../models/streetlight');
const Event = require('../models/event');
const dotenv = require('dotenv');

const getAllNotification = async (req, res) => {
  try {
    const notification = await Notification.find();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getNotificationByCode = async (req, res) => {
  const { anchor_code, streetlight_code } = req.params;

  let searchQuery;
  try {
    if (!streetlight_code) {
      searchQuery = `${anchor_code}`;
    } else {
      searchQuery = `${anchor_code}${streetlight_code}`;
    }

    const notifications = await Notification.find({
      title: { $regex: searchQuery, $options: 'i' }
    });

    if (notifications.length > 0) {
      res.json(notifications);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const createNotification = async (req, res) => {
  const { type, anchor_code, streetlight_code } = req.body;

  if (typeof type !== 'number' || !anchor_code) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  let existingStreetlights;
  try {
    // Cari semua lampu yang memiliki anchor_code yang sama
    const query = streetlight_code ? 
      { anchor_code, streetlight_code } : 
      { anchor_code, streetlight_code: { $exists: true } }; // Memastikan streetlight_code ada untuk lampu yang relevan
    existingStreetlights = await Streetlight.find({ anchor_code });

    if (!existingStreetlights || existingStreetlights.length === 0) {
      return res.status(404).json({ message: 'No streetlights found for the provided anchor_code.' });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching streetlights', error: error.message });
  }

  // Membuat notifikasi untuk setiap streetlight
  try {
    const notifications = await Promise.all(
      existingStreetlights.map(async (streetlight) => {
        // Menyusun judul dengan anchor_code dan streetlight_code jika ada
        let title;
        switch (type) {
          case 0:
            title = `Lampu ${anchor_code}${streetlight.streetlight_code ? + streetlight.streetlight_code : ''} telah dimatikan`;
            break;
          case 1:
            title = `Lampu ${anchor_code}${streetlight.streetlight_code ? + streetlight.streetlight_code : ''} telah dinyalakan`;
            break;
          case 2:
            title = `Lampu ${anchor_code}${streetlight.streetlight_code ? + streetlight.streetlight_code : ''} tidak dapat dimatikan`;
            break;
          case 3:
            title = `Lampu ${anchor_code}${streetlight.streetlight_code ? + streetlight.streetlight_code : ''} tidak dapat dinyalakan`;
            break;
          default:
            return res.status(400).json({ message: 'Invalid type provided.' });
        }

        const newNotification = new Notification({
          sender: 'Sistem',
          title,
        });
        const savedNotification = await newNotification.save();

        return savedNotification;
      })
    );

    // Jika type adalah 0 atau 1, update status semua streetlight
    if (type === 0 || type === 1) {
      const status = type === 0 ? 0 : 1;

      try {
        await Streetlight.updateMany({ anchor_code }, { status });
        await Event.updateMany({ anchor_code }, { last_status: status });
        console.log(`Status of all streetlights and events with anchor_code ${anchor_code} updated to ${status}`);
      } catch (updateError) {
        console.error('Error updating streetlight or event status:', updateError.message);
      }
    } else if (type === 2) {
      console.log(`Issue with turning off lamps with anchor_code ${anchor_code}`);
    } else if (type === 3) {
      console.log(`Issue with turning on lamps with anchor_code ${anchor_code}`);
    }

    res.status(201).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getCombinedData = async (req, res) => {
  try {
    const notifications = await Notification.find();
    const streetlights = await Streetlight.find();

    const combinedData = notifications.map(notification => {
      const match = notification.title.match(/Lampu ([A-Z]+)(\d*)/);
      if (match) {
        const anchor_code = match[1];
        const streetlight_code = match[2] || null;

        let streetlight;
        if (streetlight_code) {
          streetlight = streetlights.find(sl => 
            sl.anchor_code === anchor_code && sl.streetlight_code === streetlight_code
          );
        } else {
          streetlight = streetlights.find(sl => 
            sl.anchor_code === anchor_code && !sl.streetlight_code
          );
        }

        return {
          ...notification.toObject(),
          ...(streetlight ? streetlight.toObject() : {}),
        };
      }
      return notification.toObject();
    });

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getAllNotification,
  getNotificationByCode,
  createNotification,
  getCombinedData,
};