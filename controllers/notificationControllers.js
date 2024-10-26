const axios = require('axios');
const Notification = require('../models/notification');
const Streetlight = require('../models/streetlight');
const dotenv = require('dotenv');

const getAllNotification = async (req, res) => {
  try {
    const notification = await Notification.find();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (notification) {
      res.json(notification);
    } else {
      res.status(404).json({ message: 'Notification not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const createNotification = async (req, res) => {
  const { type, anchor_code, streetlight_code } = req.body;

  if (typeof type !== 'number' || !anchor_code || !streetlight_code) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const existingStreetlight = await Streetlight.findOne({ anchor_code, streetlight_code });
  if (!existingStreetlight) {
    return res.status(404).json({ message: `Streetlight not found.` });
  }

  let title;

  if (type === 0) {
    title = `Lampu ${anchor_code}${streetlight_code} telah dimatikan`;
  } else if (type === 1) {
    title = `Lampu ${anchor_code}${streetlight_code} telah dinyalakan`;
  } else if (type === 2) {
    title = `Lampu ${anchor_code}${streetlight_code} tidak dapat dimatikan`;
  } else if (type === 3) {
    title = `Lampu ${anchor_code}${streetlight_code} tidak dapat dinyalakan`;
  } else {
    return res.status(400).json({ message: 'Invalid type provided.' });
  }

  try {
    const newNotification = new Notification({
      sender: 'Sistem',
      title,
    });
    const savedNotification = await newNotification.save();

    if (type === 0 || type === 1) {
      const status = type === 0 ? 0 : 1;
      try {
        await Streetlight.findOneAndUpdate(
          { anchor_code, streetlight_code },
          { status }
        );
        console.log(`Status of streetlight ${anchor_code}${streetlight_code} updated to ${status}`);
      } catch (updateError) {
        console.error('Error updating streetlight status:', updateError.message);
      }

      try { // kalo jalanin di local, tinggal ganti URL_PROD jadi URL_LOCAL
        const eventResponse = await axios.put(`${process.env.URL_PROD}/events/${anchor_code}/${streetlight_code}`, {
          last_status: status
        });
      } catch (apiError) {
        console.error('Error calling event API:', apiError.message);
      }
    }

    if (type === 2) {
      console.log(`Function for handling issue with turning off lamp ${anchor_code}${streetlight_code}`);
    } else if (type === 3) {
      console.log(`Function for handling issue with turning on lamp ${anchor_code}${streetlight_code}`);
    }

    res.status(201).json(savedNotification);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getAllNotification,
  getNotificationById,
  createNotification,
};