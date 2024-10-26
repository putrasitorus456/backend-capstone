const Notification = require('../models/notification');
const Responses = require('../models/responses');

const notificationGraph = async (req, res) => {
  try {
    const dimatikanCount = await Notification.countDocuments({ title: /telah dimatikan/i });
    const dinyalakanCount = await Notification.countDocuments({ title: /telah dinyalakan/i });
    const tidakDimatikanCount = await Notification.countDocuments({ title: /tidak dapat dimatikan/i });
    const tidakDinyalakanCount = await Notification.countDocuments({ title: /tidak dapat dinyalakan/i });

    res.status(200).json({
      dimatikan: dimatikanCount,
      dinyalakan: dinyalakanCount,
      tidakDapatDimatikan: tidakDimatikanCount,
      tidakDapatDinyalakan: tidakDinyalakanCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving notification stats', error: error.message });
  }
};

const responsesGraph = async (req, res) => {
  try {
    const bermasalahCount = await Responses.countDocuments({ title: /permasalahan/i });
    const diperbaikiCount = await Responses.countDocuments({ title: /perbaikan/i });

    res.status(200).json({
      bermasalah: bermasalahCount,
      diperbaiki: diperbaikiCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving responses stats', error: error.message });
  }
};

module.exports = {
  notificationGraph,
  responsesGraph,
};