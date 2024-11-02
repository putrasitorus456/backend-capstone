const Event = require('../models/event');

const getEvents = async (req, res) => {
  try {
    const Events = await Event.find();
    res.status(200).json(Events);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const createEvent = async (req, res) => {
  const { anchor_code, streetlight_code, location, problem, repaired_yet, last_status, reported_by } = req.body;

  if (!anchor_code || typeof last_status !== 'number') {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const newEvent = new Event({
      anchor_code,
      streetlight_code,
      location,
      problem: problem || '',
      repaired_yet: repaired_yet || 0,
      last_status,
      reported_by: reported_by || 'Sistem',
    });

    const savedEvent = await newEvent.save();

    res.status(201).json(savedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

const updateEvent = async (req, res) => {
  const { anchor_code, streetlight_code } = req.params;
  const { problem, last_status, repaired_yet} = req.body;

  if (!anchor_code || !streetlight_code) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  try {
    const updatedEvent = await Event.findOneAndUpdate(
      { anchor_code, streetlight_code },
      {
        problem: problem || '',
        last_status: last_status || 0,
        repaired_yet: repaired_yet || 0
      },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ message: 'Streetlight not found' });
    }

    res.status(200).json(updatedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

module.exports = {
  getEvents,
  createEvent,
  updateEvent
};