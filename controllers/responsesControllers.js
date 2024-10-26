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
  try {
    const messageResponse = await axios.post('https://pju-backend.vercel.app/api/message', {
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

const updateEvent = async (anchor_code, streetlight_code, problem) => {
  try {
    const repairResponse = await axios.put(`https://pju-backend.vercel.app/api/events/${anchor_code}/${streetlight_code}`, {
      problem,
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

  // Define message title and body based on `type`
  const title = type === 0 ? 'Pemberitahuan Permasalahan Lampu' : 'Pemberitahuan Perbaikan Lampu';
  const body = type === 0
    ? `Terdeteksi permasalahan ${problem} untuk lampu ${anchor_code}${streetlight_code}. Segera kirimkan petugas untuk perbaikan.`
    : `Perbaikan lampu ${anchor_code}${streetlight_code}, dengan permasalahan ${problem}, telah selesai dilakukan. Lampu telah dapat menyala dan komunikasi berjalan baik.`;

  try {
    // Save response to the database
    const newResponse = new Responses({
      sender: 'Sistem',
      title,
      body,
    });
    const savedResponse = await newResponse.save();

    // Update streetlight condition in the database
    const condition = type === 0 ? 0 : 1;
    await updateStreetlightCondition(anchor_code, streetlight_code, condition);

    // Update event and send message if `type` is 0
    if (type === 0) {
      await updateEvent(anchor_code, streetlight_code, problem);
      await sendMessage(anchor_code, streetlight_code, problem, location);
    } else {
      // Clear problem for `type` 1 (repair completed)
      await updateEvent(anchor_code, streetlight_code, '');
    }

    // Send success response
    res.status(201).json(savedResponse);

  } catch (error) {
    console.error('Server error:', error.message);
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getAllResponses,
  getResponseById,
  createResponse,
};