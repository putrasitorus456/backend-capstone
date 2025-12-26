const axios = require('axios');
const Responses = require('../models/responses');
const Streetlight = require('../models/streetlight');
const dotenv = require('dotenv');

dotenv.config();

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

const sendMessage = async (anchor_code, streetlight_code, problem, location) => {
  try {
    const messageData = {
      anchor_code,
      problem,
      location,
    };

    if (streetlight_code) {
      messageData.streetlight_code = streetlight_code;
    }

    const messageResponse = await axios.post(`${process.env.URL_PROD}/api/message`, messageData);
  } catch (error) {
    console.error('Error calling message API:', error.response?.data || error.message);
  }
};

const updateStreetlightCondition = async (anchor_code, streetlight_code, condition) => {
  try {
    const query = streetlight_code ? { anchor_code, streetlight_code } : { anchor_code, streetlight_code: { $exists: false } };
    await Streetlight.findOneAndUpdate(query, { condition });
  } catch (updateError) {
    console.error('Error updating streetlight condition:', updateError.message);
  }
};

const updateEvent = async (anchor_code, streetlight_code, problem, repaired_yet) => {
  try {
    const url = streetlight_code 
      ? `${process.env.URL_PROD}/api/events/${anchor_code}/${streetlight_code}`
      : `${process.env.URL_PROD}/api/events/${anchor_code}`;
      
    const repairResponse = await axios.put(url, {
      problem,
      repaired_yet,
    });
  } catch (apiError) {
    console.error('Error calling repairs API:', apiError.message);
  }
};

const createResponse = async (req, res) => {
  const { type, problem, anchor_code, streetlight_code } = req.body;

  try {
    const savedResponse = await processResponse({ type, problem, anchor_code, streetlight_code });
    res.status(201).json(savedResponse);
  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const processResponse = async ({ type, problem, anchor_code, streetlight_code }) => {
  if (typeof type !== 'number' || !anchor_code) {
    throw new Error('Not enough data');
  }

  const query = streetlight_code ? { anchor_code, streetlight_code } : { anchor_code, streetlight_code: { $exists: false } };
  const existingStreetlight = await Streetlight.findOne(query);

  if (!existingStreetlight) {
    throw new Error('Streetlight not found');
  }

  const { location } = existingStreetlight;

  const title = type === 0 ? 'Pemberitahuan Permasalahan Lampu' : 'Pemberitahuan Perbaikan Lampu';
  const body = type === 0
    ? `Terdeteksi permasalahan ${problem} untuk lampu ${anchor_code}${streetlight_code || ''}. Segera kirimkan petugas untuk perbaikan.`
    : `Perbaikan lampu ${anchor_code}${streetlight_code || ''} telah selesai dilakukan. Lampu telah dapat menyala dan komunikasi berjalan baik.`;

  const newResponse = new Responses({
    sender: 'Sistem',
    title,
    body,
  });
  const savedResponse = await newResponse.save();

  const condition = type === 0 ? 0 : 1;
  await updateStreetlightCondition(anchor_code, streetlight_code, condition);

  if (type === 0) {
    await updateEvent(anchor_code, streetlight_code, problem, 0);
    if (streetlight_code) {
      await sendMessage(anchor_code, streetlight_code, problem, location);
    } else {
      await sendMessage(anchor_code, null, problem, location);
    }
  } else {
    await updateEvent(anchor_code, streetlight_code, '', 0);
  }

  return savedResponse;
};

const getCombinedData = async (req, res) => {
  try {
    const responses = await Responses.find();
    const streetlights = await Streetlight.find().select('-date');

    const combinedData = responses.map(response => {
      // Mencari pola huruf-angka (seperti C1, A2, dll.) atau dua huruf (seperti AA, AB, dll.)
      const match = response.body.match(/\b([A-Z]{1,2})(\d+)?\b/);

      if (match) {
        const anchor_code = match[1]; // Bagian huruf atau dua huruf
        const streetlight_code = match[2] || null; // Bagian angka jika ada

        // Mencari streetlight yang cocok berdasarkan anchor_code dan streetlight_code
        const streetlight = streetlights.find(sl => 
          sl.anchor_code === anchor_code && 
          (streetlight_code ? sl.streetlight_code === streetlight_code : !sl.streetlight_code)
        );

        return {
          ...response.toObject(),
          ...(streetlight ? streetlight.toObject() : {}),
        };
      }

      // Jika tidak ada kecocokan pola, kembalikan response saja
      return response.toObject();
    });

    res.json(combinedData);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getAllResponses,
  getResponseById,
  createResponse,
  getCombinedData,
  processResponse,
};