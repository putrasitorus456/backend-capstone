const axios = require('axios');
const Responses = require('../models/responses');
const Streetlight = require('../models/streetlight');

const getAllResponses = async (req, res) => {
  try {
    const responses = await Responses.find();
    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getResponseById = async (req, res) => {
  try {
    const response = await Responses.findById(req.params.id);
    if (response) {
      res.json(response);
    } else {
      res.status(404).json({ message: 'Response not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const createResponse = async (req, res) => {
  const { type, problem, anchor_code, streetlight_code } = req.body;

  if (typeof type !== 'number' || !problem || !anchor_code || !streetlight_code) {
    return res.status(400).json({ message: 'Not enough data' });
  }

  const existingStreetlight = await Streetlight.findOne({ anchor_code, streetlight_code });
  if (!existingStreetlight) {
    return res.status(404).json({ message: `Streetlight not found.` });
  }

  const { location } = existingStreetlight;

  let title, body;
  if (type === 0) {
    title = 'Pemberitahuan Permasalahan Lampu';
    body = `Terdeteksi permasalahan ${problem} untuk lampu ${anchor_code}${streetlight_code}. Segera kirimkan petugas untuk perbaikan.`;
  } else if (type === 1) {
    title = 'Pemberitahuan Perbaikan Lampu';
    body = `Perbaikan lampu ${anchor_code}${streetlight_code}, dengan permasalahan ${problem}, telah selesai dilakukan. Lampu telah dapat menyala dan komunikasi berjalan baik.`;
  } else {
    return res.status(400).json({ message: 'Invalid type provided. Type must be 0 or 1.' });
  }

  try {
    const newResponse = new Responses({
      sender: 'Sistem',
      title,
      body,
    });
    const savedResponse = await newResponse.save();

    const condition = type === 0 ? 0 : 1;
    try {
      await Streetlight.findOneAndUpdate(
        { anchor_code, streetlight_code },
        { condition }
      );
      console.log(`Condition of streetlight ${anchor_code}${streetlight_code} updated to ${condition}`);
    } catch (updateError) {
      console.error('Error updating streetlight condition:', updateError.message);
    }

    if (type === 0) {
      try {
      const repairResponse = await axios.put(`http://localhost:5000/api/events/${anchor_code}/${streetlight_code}`, {
        problem : problem,
      });
      console.log('Repair API response:', repairResponse.data);
      } catch (apiError) {
      console.error('Error calling repairs API:', apiError.message);
      }
    } else if (type === 1) {
      try {
        const repairResponse = await axios.put(`http://localhost:5000/api/events/${anchor_code}/${streetlight_code}`, {
          problem : '',
        });
        console.log('Repair API response:', repairResponse.data);
      } catch (apiError) {
        console.error('Error calling repairs API:', apiError.message);
      }
    }

    if (type === 0) {
      try {
        const messageResponse = await axios.post('http://localhost:5000/api/message', {
          anchor_code,
          streetlight_code,
          problem,
          location,
        });
        console.log('Message API response:', messageResponse.data);
      } catch (error) {
        console.error('Error calling message API:', error.message);
      }
    }

    res.status(201).json(savedResponse);

  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getAllResponses,
  getResponseById,
  createResponse,
};