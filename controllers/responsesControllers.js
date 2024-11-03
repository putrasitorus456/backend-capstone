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

const sendMessage = async (anchor_code, streetlight_code, problem, location) => {
  try { // kalo jalanin di local, tinggal ganti URL_PROD jadi URL_LOCAL
    const messageResponse = await axios.post(`${process.env.URL_PROD}/api/message`, {
      anchor_code,
      streetlight_code,
      problem,
      location,
    });
    console.log('Message API response:', messageResponse.data);
  } catch (error) {
    console.error('Error calling message API:', error.message);
  }
};

const updateStreetlightCondition = async (anchor_code, streetlight_code, condition) => {
  try {
    await Streetlight.findOneAndUpdate(
      { anchor_code, streetlight_code },
      { condition }
    );
    console.log(`Condition of streetlight ${anchor_code}${streetlight_code} updated to ${condition}`);
  } catch (updateError) {
    console.error('Error updating streetlight condition:', updateError.message);
  }
};

const updateEvent = async (anchor_code, streetlight_code, problem, repaired_yet) => {
  try { // kalo jalanin di local, tinggal ganti URL_PROD jadi URL_LOCAL
    const repairResponse = await axios.put(`${process.env.URL_PROD}/api/events/${anchor_code}/${streetlight_code}`, {
      problem,
      repaired_yet,
    });
    console.log('Repair API response:', repairResponse.data);
  } catch (apiError) {
    console.error('Error calling repairs API:', apiError.message);
  }
};

const createResponse = async (req, res) => {
  const { type, problem, anchor_code, streetlight_code } = req.body;

  if (typeof type !== 'number' || !problem || !anchor_code || !streetlight_code) {
    return res.status(400).json({ message: 'Not enough data' });
  }

  const existingStreetlight = await Streetlight.findOne({ anchor_code, streetlight_code });
  if (!existingStreetlight) {
    return res.status(404).json({ message: 'Streetlight not found.' });
  }

  const { location } = existingStreetlight;

  const title = type === 0 ? 'Pemberitahuan Permasalahan Lampu' : 'Pemberitahuan Perbaikan Lampu';
  const body = type === 0
    ? `Terdeteksi permasalahan ${problem} untuk lampu ${anchor_code}${streetlight_code}. Segera kirimkan petugas untuk perbaikan.`
    : `Perbaikan lampu ${anchor_code}${streetlight_code}, dengan permasalahan ${problem}, telah selesai dilakukan. Lampu telah dapat menyala dan komunikasi berjalan baik.`;

  try {
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
      await sendMessage(anchor_code, streetlight_code, problem, location);
    } else {
      await updateEvent(anchor_code, streetlight_code, '', 0);
    }

    res.status(201).json(savedResponse);

  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const getCombinedData = async (req, res) => {
  try {
    const responses = await Responses.find();
    const streetlights = await Streetlight.find();

    const combinedData = responses.map(response => {
      // Mencari pola huruf dan angka seperti C1, A2, dll.
      const match = response.body.match(/\b([A-Z])(\d+)\b/);

      if (match) {
        const anchor_code = match[1]; // Bagian huruf sebagai anchor_code
        const streetlight_code = match[2]; // Bagian angka sebagai streetlight_code

        // Mencari streetlight yang cocok dengan anchor_code dan streetlight_code
        const streetlight = streetlights.find(sl => 
          sl.anchor_code === anchor_code && sl.streetlight_code === streetlight_code
        );

        return {
          ...response.toObject(),
          ...(streetlight ? streetlight.toObject() : {}),
        };
      }
      
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
};