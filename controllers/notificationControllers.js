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

const createNotificationDirect = async (type, anchor_code, streetlight_code = null) => {
  if (typeof type !== 'number' || !anchor_code) {
    throw new Error('All fields are required');
  }

  const query = streetlight_code 
    ? { anchor_code, streetlight_code } 
    : { anchor_code, streetlight_code: { $exists: false } };

  try {
    const existingStreetlights = await Streetlight.find(query);

    if (!existingStreetlights || existingStreetlights.length === 0) {
      throw new Error('No streetlights found matching the criteria.');
    }

    const notifications = await Promise.all(
      existingStreetlights.map(async (streetlight) => {
        let title;
        const lightCode = streetlight.streetlight_code ? `${streetlight.streetlight_code}` : '';
        
        switch (type) {
          case 0:
            title = `Lampu ${anchor_code}${lightCode} telah dimatikan`;
            break;
          case 1:
            title = `Lampu ${anchor_code}${lightCode} telah dinyalakan`;
            break;
          case 2:
            title = `Lampu ${anchor_code}${lightCode} tidak dapat dimatikan`;
            break;
          case 3:
            title = `Lampu ${anchor_code}${lightCode} tidak dapat dinyalakan`;
            break;
          default:
            throw new Error('Invalid type provided.');
        }

        const newNotification = new Notification({
          sender: 'Sistem',
          title,
        });
        return await newNotification.save();
      })
    );

    if (type === 0 || type === 1) {
      const status = type === 0 ? 0 : 1;

      const updateQuery = streetlight_code 
        ? { anchor_code, streetlight_code } 
        : { anchor_code };

      await Streetlight.updateMany(query, { status });
      await Event.updateMany(updateQuery, { last_status: status });
    }

    return notifications;
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    throw error;
  }
};

// Fungsi API untuk menerima permintaan HTTP
const createNotification = async (req, res) => {
  try {
    const { type, anchor_code, streetlight_code } = req.body;
    const notifications = await createNotificationDirect(type, anchor_code, streetlight_code);
    res.status(201).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getCombinedData = async (req, res) => {
  try {
    const notifications = await Notification.find();
    const streetlights = await Streetlight.find().select('-date');

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
  createNotificationDirect,
  getCombinedData,
};